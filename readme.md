#  Fetching names with Rotating Proxies , Multiple APIs calls in Parallel & Continuous Progress Save

This project extracts unique names using an autocomplete API with rotating proxies. It ensures continuous execution, saves progress, and resumes even after a restart.

## Features
- **Rotating Proxies**: Uses multiple proxies to avoid rate limits.
- **Progress Saving**: Automatically saves progress and resumes if stopped.
- **Error Handling & Retrying**: Retries failed requests and switches proxies if needed.
- **Efficient Parallel Processing**: Uses multiple workers for faster extraction.

---

## How to Start

Navigate to the API version folder:
```sh
cd v1
npm install
node workers.js
```

## Project Structure:
```sh
/v1 (same for v2 and v3)
│── workers.js          # Main script for fetching names
│── handleProxy.js      # Manages proxies
│── progress.json       # Auto-saved progress data
│── results.json        # Extracted names
│── package.json        # Dependencies
│── result.png          # Screenshot of termainl on final extraction.

/v2
│── ...

/v3
│── ...
```

## Results

### API Rate Limit = 100 requests per minute

### V1

- Total Names: ``
- Total Requests: ``

- ![V1 Final Result](./v1/result.png)

### V2

- Total Names: `8994`
- Total Requests: `2542`

- ![V2 Final Result](./v2/result.png)

### V3

- Total Names: `2988`
- Total Requests: `613`

- ![V3 Final Result](./v3/result.png)
