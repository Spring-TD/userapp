# Account Microservice (Airsign)

This microservice handles user account management and authentication for the Airsign platform.

## Features

- User Registration (password optional)
- User Login
- Profile Management
- Authentication Middleware

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env` and update the values:
    ```bash
    cp .env.example .env
    ```

3.  **Run in Development**:
    ```bash
    npm run dev
    ```

4.  **Build and Run**:
    ```bash
    npm run build
    npm start
    ```

## API Endpoints

- `POST /api/v1/auth/register` - Create a new user (password optional)
- `POST /api/v1/auth/login` - Authenticate user
- `GET /health` - Health check

## Project Structure

- `src/config` - Configuration settings
- `src/controllers` - Route controllers
- `src/middleware` - Express middleware
- `src/models` - Mongoose models
- `src/routes` - Route definitions
- `src/services` - Business logic
