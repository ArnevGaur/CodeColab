# 🚀 CodeColab: Real-Time Collaborative Workspace

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

**CodeColab** is a production-grade, real-time collaborative code editor designed for high-performance pair programming, technical interviews, and team syncs. Built with deep integration for **Yjs** and **MongoDB Atlas**, it ensures your code is never lost and always synchronized.

---

## ✨ Key Features

- **🔄 Real-Time Synchronization**: Powered by **Yjs** and WebSockets for conflict-free, sub-millisecond document synchronization.
- **🤖 AI Assistant**: Integrated **Llama 3.3 (via Groq)** for instant code explanation, optimization, and debugging directly in the sidebar.
- **💾 Production Persistence**: All document states are securely stored in **MongoDB Atlas** with binary update retention and plain-text fallback backups.
- **🖥️ Local Execution Engine**: Run your code (Python, JavaScript, etc.) directly on the host machine with a secure, timed execution environment.
- **🔐 Secure Authentication**: Full user lifecycle management with **JWT-based** sessions and hashed password security.
- **🌓 Modern Aesthetics**: A sleek, premium dark-mode interface built with **Tailwind CSS** and **shadcn/ui**.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion.
- **Backend**: Node.js, Express.js, Socket.io.
- **Database**: MongoDB Atlas (Mongoose).
- **Collaboration**: Yjs, `y-websocket`, `y-mongodb-provider`.
- **Infrastructure**: Piston-style local code runner.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB Atlas** account and cluster.
- **Groq API Key** (for AI Assistant).

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/ArnevGaur/park-code-space-main.git
   cd park-code-space-main
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the **root** folder for the frontend:
   ```env
   VITE_GROQ_API_KEY=your_groq_key_here
   ```

   Create a `.env` file in the **server** folder for the backend:
   ```env
   PORT=5005
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_secret_key
   ```

3. **Run the Application**
   ```bash
   npm run start:all
   ```
   The app will be available at `http://localhost:8080`.

---

## 📐 Architecture

CodeColab uses a dual-persistence strategy:
1. **Binary Persistence**: The full Yjs document history is stored as binary blobs in MongoDB, allowing for perfect restoration of cursors, undo/redo states, and shared types.
2. **Snapshot Persistence**: A human-readable `lastContent` field is debounced and updated in the Room collection, providing a failsafe recovery path.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="center">
  Developed with ❤️ by the CodeColab Team
</p>
