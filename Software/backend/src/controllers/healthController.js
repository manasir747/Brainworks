function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'mine-safety-backend',
    },
  });
}

module.exports = {
  getHealth,
};
