# TrendStyle — Full-Stack E-Commerce Platform

A modern, full-stack e-commerce web application inspired by online retail platforms, featuring a dynamic product catalog, category filtering, and a responsive shopping experience.

---

## Project Overview
TrendStyle is engineered to provide a seamless online shopping experience. It connects a Python Flask REST API backend with a dynamic React frontend, ensuring smooth data flow for product browsing, searching, and user interactions.

---

## Technological Stack & Architecture
- **Frontend:** React, HTML5, CSS3, JavaScript
- **Backend:** Python, Flask, Flask-CORS, PyODBC, PyJWT
- **Database:** Relational Database (SQL Server / ODBC)
- **Tools:** Visual Studio Code, Git & GitHub, Node.js, Python venv

---

## Key Functional Modules
- **Dynamic Product Catalog:** Browse a wide range of products with real-time pricing and visual cards.
- **Category & Search Navigation:** Instant filtering through top navigation and search bars.
- **User Actions:** Interactive navigation for Login, Favorites, and Shopping Cart management.
- **RESTful API Integration:** Asynchronous communication between the React frontend and Flask backend.

---

## Local Setup & Execution Guide

If you want to run this project locally on your machine, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/ozlemnurbora/trendstyle-ecommerce.git
cd trendstyle-ecommerce
```

2. Run the Backend (Flask API)
Navigate to the backend folder, set up a virtual environment, and install dependencies automatically using the requirements file:
```bash
cd ecommerce_flask_api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

3. Run the Frontend (React)
Open a new terminal window, navigate to the frontend folder, install packages, and start the application:

```bash
cd ecommerce_frontend
npm install
npm start
```
