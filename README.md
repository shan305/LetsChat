
---

# Letschat Server

## Overview

The Letschat server is a backend application built using Node.js, Express, and Socket.io. It serves as the backend for the Letschat web application, providing real-time communication features such as chat, friend management, and user authentication.

## Project Structure

```
Letschat
|-- server
|   |-- server.js
|   |-- controllers
|   |   |-- userController.js
|   |   |-- chatController.js
|   |   |-- callController.js
|   |--  |-- Models
|   |   |-- user.js
|   |---.env
|-- client
|   |-- src
|   |   |-- Components
|   |   |   |-- LeftPanel.js
|   |   |   |-- UserDetails.js
|   |   |   |-- chatMessage.js
|   |   |   |-- Footer.js
|   |   |   |-- ProfilePage.js
|   |   |   |-- UserDetails.js
|   |   |-- Api
|   |   |   |-- api.js
|   |   |   |-- socketApi.js
|   |   |-- App.js
|   |   |-- index.js
|   |   |-- package.json
|   |   |-- tailwind.config.j
|   |   |-- chatInterface.js
|   |   |-- Auth
|   |   |   |-- AuthCOntainer.js
|   |   |   |-- Registriation.js
|   |   |   |-- SignIn.js
|   |   |-- styles
|   |   |   |-- chatInterface.css
|-- README.md
```

The server folder contains the backend code, while the client folder contains the frontend React application.

## Getting Started

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/Letschat.git
   cd Letschat
   ```

2. **Install Dependencies:**

   ```bash
   cd client
   npm install
    cd server
   npm install
   ```

3. **Run the Server:**

   ```bash
    cd client
   npm run start
    cd server
    redis-server
   node server.js
   ```

   The server will run on `http://localhost:3001`.

## Server Features

### User Authentication

- User registration with unique phone numbers passcode and name
- User sign-in and authentication using secure methods

### Chat Functionality

- Real-time chat using Socket.io
- Sending and receiving text and media messages
- Typing indicator for active users
-user online adn offline satatus
- Notification for new messages
- User Details
- Freind details and media shared , docs shared and links etc


### Friend Management

- Search for friends by phone number
- Add friends to the user's friend list
- Get a list of user's friends
- Search for existing friends

### Call Functionality
--Will be implemented
- Initiate a call to a friend
- Answer, reject, and hang-up calls
- Real-time call status updates using WebRTC and Socket.io

### User Profile

- Retrieve user profiles based on user ID

## Technologies Used

- Node.js
- Express
- MongoDB
- Socket.io
- Redis
- React
- ...

## Contributing

Contributions are welcome! Please follow the [contribution guidelines](CONTRIBUTING.md) when contributing to this project.

## License

This project is licensed under the [MIT License](LICENSE).

---

