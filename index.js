const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


mongoose.connect(process.env.Mongo_url)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB Error:', err));


const UserSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const ExerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', UserSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);


app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = new User({ username });
    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error("Error :", err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users); 
  } catch (err) {
    console.error("Error :", err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' });
    }

    const parsedDuration = parseInt(duration);
    if (isNaN(parsedDuration)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }


    let exerciseDate;
    if (date) {
      exerciseDate = new Date(date);
      if (isNaN(exerciseDate.getTime())) {
        exerciseDate = new Date();
      }
    } else {
      exerciseDate = new Date();
    }

    const exercise = new Exercise({
      userId: userId,
      description: description,
      duration: parsedDuration,
      date: exerciseDate
    });

    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = { userId: userId };

    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          query.date.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setDate(toDate.getDate() + 1);
          query.date.$lt = toDate;
        }
      }
    }
    let exerciseQuery = Exercise.find(query).sort({ date: 1 });
    
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        exerciseQuery = exerciseQuery.limit(parsedLimit);
      }
    }

    const exercises = await exerciseQuery;
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    });
  } catch (err) {
    console.error("Error fetching exercise log:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});