function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'mine-safety-backend',
  });
}

module.exports = {
  getHealth,
};
