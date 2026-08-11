# Nuxt.js Website

This is a web application built with Nuxt.js, designed to provide a platform for user interaction, content creation, and community features. It includes functionalities for user authentication, post management, commenting, and search.

## Features

*   **User Authentication:** Register, login, and logout functionalities.
*   **User Profiles:** View and manage user-specific information.
*   **Post Management:** Create, view, and interact with posts.
*   **Commenting System:** Add comments to posts.
*   **Search Functionality:** Search for content within the application.
*   **Contact Form:** A dedicated page for users to send messages.
*   **Markdown Support:** Content rendering using Markdown.

## Technologies Used

*   **Frontend:**
    *   Nuxt.js (Vue.js Framework)
    *   Tailwind CSS (for styling)
    *   DaisyUI (Tailwind CSS Component Library)
*   **Backend:**
    *   Node.js with Express.js (via Nuxt server routes)
    *   MongoDB (via Mongoose for database interaction)
*   **Other:**
    *   bcryptjs (for password hashing)
    *   jsonwebtoken (for authentication tokens)
    *   markdown-it (for Markdown parsing)
    *   axios (HTTP client)

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (Node Package Manager) or Yarn
*   MongoDB instance (local or cloud-hosted)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://git.weexnes.dev/WeeXnes/website
    cd website
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

### Configuration

Create a `.env` file in the root directory of the project and add your environment variables, such as your MongoDB connection string and JWT secret:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Running the Development Server

```bash
npm run dev
```
or
```bash
yarn dev
```

This will start the development server at `http://localhost:3000`.

### Building for Production

To build the application for production:

```bash
npm run build
```
or
```bash
yarn build
```

To preview the production build locally:

```bash
npm run preview
```
or
```bash
yarn preview
```

For a full production build and preview:

```bash
npm run quick-preview
```

### Production Deployment (PM2)

The `package.json` includes a script for production deployment using PM2:

```bash
npm run production-build
```
This script stops all PM2 processes, deletes them, builds the Nuxt application, and then starts it using PM2. Ensure PM2 is installed globally (`npm install -g pm2`).

## Project Structure

```
.
├── app.vue                 # Main Vue application entry
├── nuxt.config.ts          # Nuxt.js configuration
├── package.json            # Project dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
├── components/             # Vue components
├── core/                   # Core utilities and global configurations
├── middleware/             # Nuxt middleware
├── pages/                  # Vue pages/routes
├── public/                 # Static assets
├── server/                 # Backend API routes, models, and utilities
│   ├── api/                # API endpoints
│   ├── models/             # Mongoose schemas
│   ├── plugins/            # Server-side plugins
│   └── util/               # Server-side utilities (e.g., database connection)
└── styles/                 # Global styles
```