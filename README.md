## What Has Been Done

### `Queue.ts`
- Added TypeScript interfaces for correct type checking and better TypeScript support.
- Introduced constants for retry count, dynamic retry delay, and maximum processing time (in milliseconds).
- Added a locking mechanism to the `Enqueue` method, along with a retry counter and dynamic retry time.
- In the `Dequeue` method:
  - First, try to find the message by index.
  - If no message is found, the worker exits and returns undefined.
  - Otherwise, the task is locked, a progress ID is generated, and a timestamp is added.
- Implemented a retry mechanism with a maximum of 5 retries and a progressively increasing retry delay.
- Added **`ForceUnlock`** method to optionally release a lock on a message based on its key, which could be useful for debugging or special use cases.
- Added **`GetDeadQueue`** method to optionally retrieve dead messages that failed after retry attempts.
- Added **`RetryDeadQueue`** method to optionally retry processing dead messages that have not exceeded the maximum retry limit.


## QueueBasic.ts
The QueueBasic.ts class simplifies the queue logic by removing features like retry mechanisms and the handling of dead messages. It focuses on basic queue operations: enqueueing, dequeuing, confirming, and checking the size

## QueueBasicState.ts
QueueBasicState.ts implements a simple in-memory task queue that supports basic lifecycle operations:

- Enqueue: Adds a new message if it hasn’t been added before.

- Dequeue: Assigns the next available message to a worker, ensuring only one task with the same key is processed at a time.

- Confirm: Marks a task as done only if the correct worker confirms it.

- State Tracking: Each task has a state (queued, processing, done) and tracks how many times it's been attempted.

- Metrics: Methods like Size(), InProcessing(), and Done() provide insight into the current queue status.

This version is focused on clarity and correctness without retry logic, expiration, or failure handling.

## What Could Be Improved

### `main.ts`
- Since this is a simulation, it might be useful to add error handling and logging to improve the visibility of any issues and provide better diagnostics.

### `Worker.ts`
- Introduced a retry mechanism that increases the delay between each retry attempt.
- Set a limit on the number of retry attempts to avoid infinite retries.
- Added error handling and proposed saving error and success logs into a database for later analysis and fixes. I recommend using MongoDB for storing these logs.
- In case of failure, we can add the message back to the queue to retry it later.
- If a task fails after 5 retry attempts, it should be logged, and the worker should be restarted. If the issue persists, stop the worker and create a detailed error report in the database.

## Additional Suggestions

### Handling Different Error Types
It would be beneficial to handle different types of errors, such as network or database errors. The retry logic could be tailored to handle specific error types. For example:

- Skip retrying for certain errors.
- Increase retries and the delay interval for others, based on the nature of the error.


# Project Setup and Instructions

To run this project, you can use either `npm` or `yarn` as your package manager. Below are the instructions to set up and run the project.

## Prerequisites

- Node.js installed on your machine.
- TypeScript installed globally (`npm install -g typescript`), or as a project dependency.

## Installation

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install dependencies:

   - Using `npm`:
     ```bash
     npm install
     ```

   - Using `yarn`:
     ```bash
     yarn install
     ```

## Scripts

Here are the available scripts in the project:

- **`build`**: Compiles the TypeScript code into JavaScript.
  ```bash
  npm run build
  ```
  Or with `yarn`:
  ```bash
  yarn build
  ```

- **`start`**: Runs the compiled JavaScript code from the dist folder.
  ```bash
  npm run start
  ```
  Or with `yarn`:
  ```bash
  yarn start
  ```

- **`dev`**: Runs the TypeScript code directly using `ts-node`. Useful for development and testing.
  ```bash
  npm run dev
  ```
  Or with `yarn`:
  ```bash
  yarn dev
  ```

- **`watch`**: Starts the TypeScript compiler in watch mode, automatically recompiling code as you make changes.
  ```bash
  npm run watch
  ```
  Or with `yarn`:
  ```bash
  yarn watch
  ```

## Running the Application

After installing the dependencies, you can start the application by running:

- **Development Mode:**
  ```bash
  npm run dev
  ```
  Or with `yarn`:
  ```bash
  yarn dev
  ```
  This will run the code directly from TypeScript, allowing you to quickly test changes.

- **Production Mode:**

  First, build the TypeScript code:
  ```bash
  npm run build
  ```
  Or with `yarn`:
  ```bash
  yarn build
  ```

  Then, start the compiled JavaScript application:
  ```bash
  npm run start
  ```
  Or with `yarn`:
  ```bash
  yarn start
  ```

## Further Information

If you'd like to contribute to the project or make changes, you can use the `watch` script to continuously recompile TypeScript files as you edit them. Simply run:

  ```bash
  npm run watch
  ```
  Or with `yarn`:
  ```bash
  yarn watch
  ```

This setup ensures that your development process is as smooth and efficient as possible.
