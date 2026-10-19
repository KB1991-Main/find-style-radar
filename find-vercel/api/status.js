module.exports = function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({configured:Boolean(process.env.SERPAPI_KEY),provider:'SerpApi Google Shopping',stores:['boozt','zalando']});
};
