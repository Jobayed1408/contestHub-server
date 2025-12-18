# 🖥️ ContestHub Server (Backend API)

This is the **backend server** for the **ContestHub** full-stack application.  
It provides secure REST APIs for authentication, contests, tasks, payments, winners, leaderboard, and role-based access control.

Built using **Node.js, Express, MongoDB, Firebase Admin, JWT, and Stripe**.

---

## 🚀 Live Server URL
https://your-server-link.com

---

## 🛠️ Technologies Used
- Node.js
- Express.js
- MongoDB (Atlas)
- Firebase Admin SDK
- JSON Web Token (JWT)
- Stripe Payment Gateway
- dotenv
- cors

---

## 🔐 Authentication & Security
- Firebase token verification
- JWT based secure API access
- Role-based authorization (User / Creator / Admin)
- Protected admin-only routes
- Server-side validation for sensitive operations

---

## 👥 User Roles
- **User** → Participate in contests, submit tasks
- **Creator** → Create contests
- **Admin** → Manage users, contests, winners

> ✅ Supports **multiple admins** (not limited to one)

---

## 📦 API Features

### 👤 User APIs
- Register user
- Get user role
- Update user role (admin only)
- Get all users (admin only)

---

### 🏆 Contest APIs
- Create contest (creator)
- Get all approved contests
- Get single contest details
- Approve / reject contest (admin)
- Declare winner **only after deadline**
- Contest deadline validation

---

### 📝 Task APIs
- Submit contest task (user)
- Prevent duplicate submissions
- Mark task as winner
- Remove previous winner automatically

---

### 🥇 Winner & Leaderboard APIs
- Declare contest winner (admin)
- Fetch recent winners
- Leaderboard:
  - Ranked by number of contest wins
  - Sorted descending (highest wins first)

---

### 💳 Payment APIs
- Stripe payment intent creation
- Secure server-side payment handling
- Payment validation before task submission

---

## 🏁 Winner Declaration Rule
- Winner **cannot be declared before contest deadline**
- Server checks current date vs contest deadline
- Returns error if deadline is not finished

---

## 📄 Pagination Support
- Backend pagination using:
  - `page`
  - `limit`
- Improves performance for large data sets

---

## 🔄 Sorting Support
- Sort contests by:
  - Newest
  - Deadline
- Sort leaderboard by:
  - Highest wins

---

## 📁 Folder Structure
```bash
server/
 ├── middleware/
 │   ├── verifyJWT.js
 │   ├── verifyAdmin.js
 │   └── verifyFBToken.js
 ├── routes/
 │   ├── users.js
 │   ├── contests.js
 │   ├── tasks.js
 │   └── payments.js
 ├── config/
 │   └── firebase.js
 ├── index.js
 └── .env
