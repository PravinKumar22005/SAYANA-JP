const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

exports.getNews = async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = "Provide a summary of the top 5 latest news headlines in technology and world events. Format it as a simple list.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ news: text });
  } catch (error) {
    console.error('Error fetching news from Generative AI:', error);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
};

exports.getChatbotResponse = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    res.status(500).json({ message: 'Failed to get chatbot response' });
  }
};
