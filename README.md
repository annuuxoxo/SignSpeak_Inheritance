# Interactive Sign Language Learning Platform

## Run the project

Open three terminals and run these commands.

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

### Backend API
```powershell
cd backend
npm install
npm run dev
```

### Common Words Model (Python)
```powershell
# create + activate a Python 3.11 venv at root
py -3.11 -m venv venv311
.\venv311\Scripts\activate

# install deps
python -m pip install --upgrade pip
pip install numpy tensorflow

# run the server
python backend\ai\common_words_server.py
python common_words_server.py
```
