# YouTube Comment Sentiment Analysis Chrome Extension

This Chrome Extension allows users to analyze and visualize the sentiment of comments on YouTube videos. It fetches comments from the video and performs sentiment analysis, displaying insightful metrics such as sentiment distribution, trends over time, and top comments. The extension also generates visual representations like sentiment pie charts, trend graphs, and word clouds.

## Features

- **YouTube Video ID Extraction**: Detects if the current page is a YouTube video and extracts the video ID.
- **Comment Fetching**: Fetches up to 500 comments from the video using the YouTube API.
- **Sentiment Analysis**: Analyzes the sentiment of each comment and categorizes them as positive, negative, or neutral.
- **Comment Analysis Summary**: Displays metrics like total comments, unique commenters, average comment length, and average sentiment score.
- **Sentiment Distribution**: Visualizes the sentiment distribution of comments in a pie chart (positive, neutral, negative).
- **Sentiment Trend Over Time**: Shows a sentiment trend graph based on the timestamps of comments.
- **Word Cloud**: Generates a word cloud from the most frequently used words in the comments.
- **Top Comments**: Displays the top 25 comments with their sentiment scores.

## Installation

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/sahilbhardwaj23/youtube-comment-Chrome-Plugin.git
   ```

2. Open Chrome, and go to the Extensions page (`chrome://extensions/`).

3. Enable **Developer mode** at the top right.

4. Click **Load unpacked**, and select the directory where you cloned the repository.

5. The extension will now be installed and visible in your browser.

## Usage

1. Once installed, navigate to any YouTube video page.
2. Click on the extension icon to open the popup.
3. The extension will extract the YouTube video ID, fetch the comments, and perform sentiment analysis.
4. View the analysis results directly in the extension popup, which includes:
   - Total comments, unique commenters, and average sentiment score.
   - A pie chart of sentiment distribution.
   - A sentiment trend graph over time.
   - A word cloud of frequently used words.
   - The top 25 comments with sentiment scores.

## API Integration

The extension communicates with a backend API to perform sentiment analysis and generate visualizations. Ensure that the backend API is running locally or is accessible for the extension to function properly.

- **Backend API URL**: `http://localhost:5000` (by default, but this can be configured in the code).
- The API provides endpoints for sentiment prediction (`/predict_with_timestamps`), chart generation (`/generate_chart`), word cloud generation (`/generate_wordcloud`), and trend graph generation (`/generate_trend_graph`).

## Dependencies

- [Google YouTube API](https://developers.google.com/youtube/v3) for fetching comments.
- A running instance of the backend API for sentiment analysis.


## Acknowledgments

- Thanks to [YouTube API](https://developers.google.com/youtube/v3) for providing access to video comments.
- Thanks to [Flask](https://flask.palletsprojects.com/) for the backend API.

## Contact

For any inquiries or issues, please reach out to [sahilbhardwaj23](https://github.com/sahilbhardwaj23).
```

### How this works:
- **Features**: A list of all the functionalities of the Chrome Extension.
- **Installation**: Step-by-step instructions to install the extension on Chrome.
- **Usage**: How to use the extension once it's installed.
- **API Integration**: Information on the backend API that powers the sentiment analysis and generates visualizations.
- **Dependencies**: Any necessary dependencies for the extension.
- **Contributing**: Guidelines for contributing to the project.
- **License**: The license under which the project is distributed.
- **Acknowledgments**: Credits to the technologies used in the project.
