// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");
  const API_KEY = 'Your_API_Key';  
  const API_URL = 'http://localhost:5000';
  let globalComments = [];
  let globalPredictions = [];
  let currentFilter = 'all';

  // Get the current tab's URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;
    const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
    const match = url.match(youtubeRegex);

    if (!match || !match[1]) {
      showError("This is not a valid YouTube URL.");
      return;
    }

    const videoId = match[1];
    showLoading("Initializing...");

    try {
      showLoading("Fetching video details...");
      const comments = await fetchAllComments(videoId);
      globalComments = comments;
      
      if (comments.length === 0) {
        showError("No comments found for this video.");
        return;
      }

      showLoading(`Analyzing ${comments.length} comments...`);
      const predictions = await getSentimentPredictions(comments);
      globalPredictions = predictions;

      if (predictions) {
        displayResults(comments, predictions);
      } else {
        showError("Error analyzing comments.");
      }
    } catch (error) {
      showError(`Error: ${error.message}`);
      console.error(error);
    }
  });

  function showLoading(message) {
    outputDiv.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
      </div>`;
  }

  function showError(message) {
    outputDiv.innerHTML = `<div class="error">${message}</div>`;
  }

  function showWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning';
    warningDiv.innerHTML = message;
    outputDiv.appendChild(warningDiv);
  }

  function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    outputDiv.innerHTML = `
      <div class="progress-container">
        <div class="progress-text">Fetching comments: ${current} of ${total}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
        <div id="commentCount">Progress: ${percent}%</div>
      </div>`;
  }

  async function fetchAllComments(videoId) {
    let comments = [];
    let pageToken = "";
    let totalComments = 0;
    const maxRetries = 3;
    const batchSize = 100;

    try {
      // Get initial comment count
      const initialResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=1&key=${API_KEY}`
      );
      const initialData = await initialResponse.json();
      
      if (initialData.error) {
        throw new Error(initialData.error.message);
      }
      
      totalComments = initialData.pageInfo?.totalResults || 0;

      // Fetch all comments with retry mechanism
      while (true) {
        let retryCount = 0;
        let success = false;

        while (!success && retryCount < maxRetries) {
          try {
            const response = await fetch(
              `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${batchSize}&pageToken=${pageToken}&key=${API_KEY}&textFormat=plainText&order=time`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
              throw new Error(data.error.message);
            }

            if (!data.items || data.items.length === 0) {
              break;
            }

            data.items.forEach(item => {
              const snippet = item.snippet.topLevelComment.snippet;
              comments.push({
                text: snippet.textOriginal,
                timestamp: snippet.publishedAt,
                authorId: snippet.authorChannelId?.value || 'Unknown',
                likeCount: snippet.likeCount,
                publishedAt: snippet.publishedAt
              });
            });

            updateProgress(comments.length, totalComments);

            pageToken = data.nextPageToken || "";
            if (!pageToken) break;

            success = true;
          } catch (error) {
            retryCount++;
            console.error(`Retry ${retryCount} failed:`, error);
            if (retryCount === maxRetries) {
              throw new Error(`Failed to fetch comments after ${maxRetries} attempts`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        }

        if (!pageToken) break;

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (comments.length < totalComments) {
        showWarning(`Note: Retrieved ${comments.length} out of ${totalComments} comments`);
      }

    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }

    return comments;
  }

  async function getSentimentPredictions(comments) {
    try {
      const batchSize = 100;
      let allPredictions = [];

      for (let i = 0; i < comments.length; i += batchSize) {
        const batch = comments.slice(i, i + batchSize);
        showLoading(`Analyzing comments... ${Math.min(i + batchSize, comments.length)}/${comments.length}`);

        const response = await fetch(`${API_URL}/predict_with_timestamps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comments: batch })
        });

        if (!response.ok) {
          throw new Error('Error analyzing comments');
        }

        const results = await response.json();
        allPredictions = allPredictions.concat(results);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return allPredictions;
    } catch (error) {
      console.error("Error in sentiment analysis:", error);
      throw error;
    }
  }

  function displayResults(comments, predictions) {
    const metrics = calculateMetrics(comments, predictions);
    const sentimentCounts = calculateSentimentCounts(predictions);
    
    outputDiv.innerHTML = `
      <div class="fixed-header">
        ${generateMetricsSection(metrics)}
        ${generateSentimentTable(sentimentCounts, predictions.length)}
        <div class="visualization-container">
          ${generateChartSection()}
          ${generateTrendSection()}
        </div>
        ${generateWordCloudSection()}
      </div>
      <div class="scrollable-content">
        ${generateFilterButtons()}
        ${generateCommentsSection(predictions, currentFilter)}
      </div>
    `;

    fetchAndDisplayChart(sentimentCounts);
    fetchAndDisplayTrendGraph(predictions);
    fetchAndDisplayWordCloud(comments.map(comment => comment.text));
    setupEventListeners();
  }

  function calculateMetrics(comments, predictions) {
    const totalComments = comments.length;
    const uniqueCommenters = new Set(comments.map(c => c.authorId)).size;
    const totalWords = comments.reduce((sum, c) => 
      sum + c.text.split(/\s+/).filter(w => w.length > 0).length, 0
    );
    const totalSentiment = predictions.reduce((sum, p) => 
      sum + parseInt(p.sentiment), 0
    );

    return {
      totalComments,
      uniqueCommenters,
      avgWordLength: (totalWords / totalComments).toFixed(2),
      avgSentiment: (((totalSentiment / totalComments) + 1) / 2 * 10).toFixed(2)
    };
  }

  function calculateSentimentCounts(predictions) {
    return predictions.reduce((counts, p) => {
      counts[p.sentiment]++;
      return counts;
    }, { "1": 0, "0": 0, "-1": 0 });
  }

  function generateFilterButtons() {
    return `
      <div class="filter-container">
        <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All Comments</button>
        <button class="filter-btn ${currentFilter === 'positive' ? 'active' : ''}" data-filter="positive">Positive</button>
        <button class="filter-btn ${currentFilter === 'neutral' ? 'active' : ''}" data-filter="neutral">Neutral</button>
        <button class="filter-btn ${currentFilter === 'negative' ? 'active' : ''}" data-filter="negative">Negative</button>
      </div>`;
  }

  function generateMetricsSection(metrics) {
    return `
      <div class="section">
        <div class="section-title">Comment Analysis Summary</div>
        <div class="metrics-container">
          <div class="metric">
            <div class="metric-title">Total Comments</div>
            <div class="metric-value">${metrics.totalComments}</div>
          </div>
          <div class="metric">
            <div class="metric-title">Unique Commenters</div>
            <div class="metric-value">${metrics.uniqueCommenters}</div>
          </div>
          <div class="metric">
            <div class="metric-title">Avg Comment Length</div>
            <div class="metric-value">${metrics.avgWordLength} words</div>
          </div>
          <div class="metric">
            <div class="metric-title">Avg Sentiment Score</div>
            <div class="metric-value">${metrics.avgSentiment}/10</div>
          </div>
        </div>
      </div>`;
  }

  function generateSentimentTable(counts, total) {
    return `
      <div class="section">
        <div class="section-title">Sentiment Analysis Results</div>
        <table class="sentiment-table">
          <thead>
            <tr>
              <th>Sentiment</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr class="positive-row">
              <td>Positive</td>
              <td>${counts["1"]}</td>
              <td>${((counts["1"] / total) * 100).toFixed(2)}%</td>
            </tr>
            <tr class="neutral-row">
              <td>Neutral</td>
              <td>${counts["0"]}</td>
              <td>${((counts["0"] / total) * 100).toFixed(2)}%</td>
            </tr>
            <tr class="negative-row">
              <td>Negative</td>
              <td>${counts["-1"]}</td>
              <td>${((counts["-1"] / total) * 100).toFixed(2)}%</td>
            </tr>
            <tr>
              <td>Total</td>
              <td>${total}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  function generateChartSection() {
    return `
      <div class="section">
        <div class="section-title">Sentiment Breakdown</div>
        <div id="chart-container"></div>
      </div>`;
  }

  function generateTrendSection() {
    return `
      <div class="section">
        <div class="section-title">Sentiment Trend Over Time</div>
        <div id="trend-graph-container"></div>
      </div>`;
  }

  function generateWordCloudSection() {
    return `
      <div class="section">
        <div class="section-title">Comment Wordcloud</div>
        <div id="wordcloud-container"></div>
      </div>`;
  }

  function generateCommentsSection(predictions, filter) {
    let filteredPredictions = predictions;
    
    if (filter === 'positive') {
      filteredPredictions = predictions.filter(p => p.sentiment === "1");
    } else if (filter === 'neutral') {
      filteredPredictions = predictions.filter(p => p.sentiment === "0");
    } else if (filter === 'negative') {
      filteredPredictions = predictions.filter(p => p.sentiment === "-1");
    }

    const sortedPredictions = filteredPredictions.sort((a, b) => parseInt(b.sentiment) - parseInt(a.sentiment));
    
    return `
      <div class="section">
        <div class="section-title">Filtered Comments (${filteredPredictions.length})</div>
        <ul class="comment-list">
          ${sortedPredictions.map((item, index) => `
            <li class="comment-item ${getSentimentClass(item.sentiment)}">
              <span class="comment-text">${item.comment}</span>
              <div class="comment-metadata">
                <span class="comment-sentiment">Sentiment: ${getSentimentLabel(item.sentiment)}</span>
                <span class="comment-timestamp">${formatTimestamp(item.timestamp)}</span>
              </div>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  function getSentimentClass(sentiment) {
    return {
      "1": "positive",
      "0": "neutral",
      "-1": "negative"
    }[sentiment] || "";
  }

  function getSentimentLabel(sentiment) {
    return {
      "1": "Positive",
      "0": "Neutral",
      "-1": "Negative"
    }[sentiment] || "Unknown";
  }

  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function setupEventListeners() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        displayResults(globalComments, globalPredictions);
      });
    });
  }

  async function fetchAndDisplayChart(sentimentCounts) {
    try {
      const response = await fetch(`${API_URL}/generate_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment_counts: sentimentCounts })
      });
      if (!response.ok) throw new Error('Failed to fetch chart image');
      
      const blob = await response.blob();
      const imgURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imgURL;
      img.style.width = '100%';
      img.style.marginTop = '20px';
      document.getElementById('chart-container').appendChild(img);
    } catch (error) {
      console.error("Error fetching chart:", error);
      document.getElementById('chart-container').innerHTML = "<p class='error'>Error generating chart</p>";
    }
  }

  async function fetchAndDisplayWordCloud(comments) {
    try {
      const response = await fetch(`${API_URL}/generate_wordcloud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments })
      });
      if (!response.ok) throw new Error('Failed to fetch word cloud image');
      
      const blob = await response.blob();
      const imgURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imgURL;
      img.style.width = '100%';
      img.style.marginTop = '20px';
      document.getElementById('wordcloud-container').appendChild(img);
    } catch (error) {
      console.error("Error fetching word cloud:", error);
      document.getElementById('wordcloud-container').innerHTML = "<p class='error'>Error generating word cloud</p>";
    }
  }

  async function fetchAndDisplayTrendGraph(sentimentData) {
    try {
      const response = await fetch(`${API_URL}/generate_trend_graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment_data: sentimentData })
      });
      if (!response.ok) throw new Error('Failed to fetch trend graph image');
      
      const blob = await response.blob();
      const imgURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imgURL;
      img.style.width = '100%';
      img.style.marginTop = '20px';
      document.getElementById('trend-graph-container').appendChild(img);
    } catch (error) {
      console.error("Error fetching trend graph:", error);
      document.getElementById('trend-graph-container').innerHTML = "<p class='error'>Error generating trend graph</p>";
    }
  }
});
