const express = require('express');
const router = express.Router();
const Command = require('../models/Command');

// GET /api/commands/pending
// Called by ESP8266 to check for new commands
router.get('/pending', async (req, res) => {
  try {
    const cmd = await Command.findOneAndUpdate(
      { executed: false },
      { executed: true, executed_at: new Date() },
      { sort: { created_at: 1 }, new: false }
    );

    if (!cmd) {
      return res.json({ has_command: false });
    }

    res.json({
      has_command: true,
      command:     cmd.command,
      value:       cmd.value,
      id:          cmd._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/commands
// Called by frontend to send a control command
// Body: { command: 'pump_on'|'pump_off'|'servo'|'manual_on'|'manual_off', value: number }
router.post('/', async (req, res) => {
  try {
    const { command, value } = req.body;

    const validCommands = ['pump_on', 'pump_off', 'servo', 'manual_on', 'manual_off'];
    if (!validCommands.includes(command)) {
      return res.status(400).json({ error: 'Invalid command' });
    }

    const cmd = await Command.create({ command, value: value || 0, executed: false });

    // Also notify via socket so frontend updates optimistically
    const io = req.app.get('io');
    io.emit('command_sent', { command, value });

    res.json({ status: 'queued', id: cmd._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/commands/history
// Frontend: show log of past commands
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await Command.find().sort({ created_at: -1 }).limit(limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
