import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Auth from './pages/Auth';

// --- SVG Icon Components ---

/**
 * Renders a feature icon based on type.
 */
const FeatureIcon = ({ type, className }) => {
  // Updated default color to the new brown
  const iconClass = className || "w-12 h-12 text-[#603B2A] mb-6";
  
  switch (type) {
    case 'emotion':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'translate': // UPDATED ICON
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V10a2 2 0 012-2h8z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 15v-3a1 1 0 00-1-1H3m0 0l2-2m-2 2l2 2m1-5V4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1z"></path>
        </svg>
      );
    case 'secure':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case 'multilingual':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2H10a2 2 0 002-2v-1a2 2 0 012-2h1.945M12 8c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 8 12 8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM12 12a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      );
    // --- New Icons for expanded sections ---
    case 'step1': // How it works: Open App - UPDATED ICON
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 8v4m0 0l-2-2m2 2l2-2"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
      );
    case 'step2': // How it works: AI Scans
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      );
    case 'step3': // How it works: Translate
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z"></path></svg>
      );
    case 'tech-emotion': // UPDATED ICON
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="2 2" d="M8 14.01c.148-.59.83-1.01 1.558-1.01h4.884c.728 0 1.41.42 1.558 1.01"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="1 1" d="M3.5 9.5v.01M3.5 14.5v.01M20.5 9.5v.01M20.5 14.5v.01M12 3.5v.01M12 20.5v.01"></path>
        </svg>
      );
    case 'tech-sign':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 17.9291C8 17.9291 5.5 19.9291 3.5 16.9291C1.5 13.9291 3.5 10.9291 5.5 8.9291C7.5 6.9291 10.5 4.9291 12.5 6.9291C14.5 8.9291 16.5 11.9291 18.5 10.9291C20.5 9.9291 22 7.9291 22 7.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M11 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Renders a floating hand sign SVG.
 */
const HandSignIcon = ({ type, className }) => {
  const iconClass = className || "w-full h-full";
  if (type === 'love') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.5 17C10.119 17 9 15.881 9 14.5V9C9 7.619 10.119 6.5 11.5 6.5C12.881 6.5 14 7.619 14 9V14.5C14 15.881 12.881 17 11.5 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 14.5V9C6 7.619 7.119 6.5 8.5 6.5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 8.5H14.5C15.881 8.5 17 9.619 17 11V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 14.5C6 15.881 4.881 17 3.5 17C2.119 17 1 15.881 1 14.5C1 13.119 2.119 12 3.5 12C4.881 12 6 13.119 6 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 14.5C17 15.881 18.119 17 19.5 17C20.881 17 22 15.881 22 14.5C22 13.119 20.881 12 19.5 12C18.119 12 17 13.119 17 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === 'ok') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 14.5V9C9 7.619 10.119 6.5 11.5 6.5C12.881 6.5 14 7.619 14 9V14.5C14 15.881 12.881 17 11.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 14.5V9C6 7.619 7.119 6.5 8.5 6.5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 11.5C14 9.567 15.567 8 17.5 8C19.433 8 21 9.567 21 11.5C21 13.433 19.433 15 17.5 15C15.567 15 14 13.433 14 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.5 17C10.119 17 9 15.881 9 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === 'wave') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 17.9291C8 17.9291 5.5 19.9291 3.5 16.9291C1.5 13.9291 3.5 10.9291 5.5 8.9291C7.5 6.9291 10.5 4.9291 12.5 6.9291C14.5 8.9291 16.5 11.9291 18.5 10.9291C20.5 9.9291 22 7.9291 22 7.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return null;
};

/**
 * Renders a floating speech-to-sign symbol.
 */
const SpeechToSignIcon = ({ className }) => (
  <svg className={className || "w-full h-full"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 12V11C7 9.11438 7 8.17157 7.58579 7.58579C8.17157 7 9.11438 7 11 7H13C14.8856 7 15.8284 7 16.4142 7.58579C17 8.17157 17 9.11438 17 11V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9L12 7L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 14V15C3 16.8856 3 17.8284 3.58579 18.4142C4.17157 19 5.11438 19 7 19H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 14V15C21 16.8856 21 17.8284 20.4142 18.4142C19.8284 19 18.8856 19 17 19H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- New Chatbot Icons ---
const ChatIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
);

const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
);

const SendIcon = ({ className }) => (
  // Simple filled triangle pointing right (suitable for a send button)
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M3 2L21 12L3 22V13L15 12L3 11V2Z" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
);

// --- API Helper ---

/**
 * Fetches from Gemini API with exponential backoff.
 */
const fetchWithBackoff = async (url, options, retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      if (response.status >= 400 && response.status < 500) {
          console.error("Client error:", response.status, await response.text());
          throw new Error(`Client error: ${response.status}`);
      }
      // Retry on server errors (5xx) or rate-limiting (429)
    } catch (error) {
      if (i === retries - 1) {
        console.error("Final attempt failed:", error);
        throw error;
      }
    }
    const jitter = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i) + jitter));
  }
};


// --- Data for Features and Animations ---

const features = [
  {
    title: "AI Emotion Detection",
    description: "Our advanced AI reads facial expressions to understand the emotion behind the words.",
    icon: "emotion",
  },
  {
    title: "Real-Time Sign Translation",
    description: "Instantly translate spoken language to sign language and back, all on your device.",
    icon: "translate",
  },
  {
    title: "Private & Secure Conversations",
    description: "End-to-end encryption ensures your personal conversations remain private.",
    icon: "secure",
  },
  {
    title: "Multilingual Support",
    description: "Communicate in multiple sign and spoken languages, breaking down all barriers.",
    icon: "multilingual",
  },
];

const floatingIcons = [
  { id: 1, icon: <HandSignIcon type="love" />, top: '15%', left: '10%', size: '40px', duration: 8 },
  { id: 2, icon: <SpeechToSignIcon />, top: '25%', left: '80%', size: '30px', duration: 6 },
  { id: 3, icon: <HandSignIcon type="ok" />, top: '60%', left: '90%', size: '50px', duration: 10 },
  { id: 4, icon: <HandSignIcon type="wave" />, top: '70%', left: '10%', size: '35px', duration: 7 },
  { id: 5, icon: <SpeechToSignIcon />, top: '85%', left: '50%', size: '25px', duration: 5 },
  { id: 6, icon: <HandSignIcon type="love" />, top: '40%', left: '60%', size: '45px', duration: 9 },
];

const howItWorksSteps = [
  {
    icon: "step1",
    title: "Point Your Camera",
    description: "Simply open the app and point your camera. Sayana is ready to listen and see."
  },
  {
    icon: "step2",
    title: "AI Scans & Understands",
    description: "Our AI instantly analyzes facial expressions for emotion and hand gestures for sign language."
  },
  {
    icon: "step3",
    title: "Get Instant Translation",
    description: "Receive real-time translations as text or synthesized speech, complete with emotional context."
  }
];

const testimonials = [
  {
    name: "Aisha K.",
    role: "ISL Educator",
    quote: "SAYANA is a revolutionary tool for bridging the gap. The emotion detection adds a layer of understanding I've never seen in any other app.",
    stars: 5
  },
  {
    name: "Michael T.",
    role: "Family Member",
    quote: "I can finally have nuanced conversations with my deaf son. Understanding his emotions, not just his words, has changed everything for us.",
    stars: 5
  },
  {
    name: "Chen W.",
    role: "App User",
    quote: "As someone who is mute, this app has given me my voice. The real-time translation is fast and accurate. It's my daily companion.",
    stars: 5
  },
  {
    name: "Dr. Elena Rodriguez",
    role: "Accessibility Researcher",
    quote: "The team at SAYANA has prioritized security and privacy alongside innovation. It's a model for accessible technology.",
    stars: 5
  }
];

const faqData = [
  {
    question: "How does the AI Emotion Detection work?",
    answer: "Our AI model has been trained on a diverse dataset of facial expressions to recognize subtle nuances that convey emotion. It analyzes key facial landmarks in real-time to provide context to the communication, understanding if the user is happy, sad, surprised, etc."
  },
  {
    question: "Is my data and my conversations private?",
    answer: "Absolutely. Privacy is at the core of SAYANA. All conversations are end-to-end encrypted. We do not store your personal conversation data, and all AI processing for translation and emotion detection happens securely."
  },
  {
    question: "What sign languages and spoken languages are supported?",
    answer: "We are constantly expanding our language library. Currently, we lead with support for ISL (Indian Sign Language), with translation to and from English, Spanish, Mandarin, and Hindi. More languages are in development!"
  },
  {
    question: "Is SAYANA an app I need to download?",
    answer: "SAYANA is a powerful web application, which means you don't need to download anything! You can access it from any modern browser on your computer, tablet, or phone, ensuring you always have the latest version."
  },
  {
    question: "How can I get involved or support SAYANA's mission?",
    answer: "We're so glad you asked! You can support us by sharing the app with your community, providing feedback for improvements, or following and sharing our mission on social media. We also partner with organizations for accessibility. Please visit our 'Contact' page for more information."
  }
];


// --- Animation Variants ---

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut"
    }
  }
};

const buttonSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 20
};

// --- New Sub-Components ---

/**
 * SectionHeader: A reusable component for section titles and subtitles.
 */
const SectionHeader = ({ title, subtitle }) => (
  <motion.div
    className="mb-16 text-center"
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={fadeIn}
  >
    <h2 className="text-4xl sm:text-5xl font-extrabold text-[#4a2e1f] mb-4">
      {title}
    </h2>
    <p className="text-lg sm:text-xl text-[#603B2A]/80 max-w-3xl mx-auto">
      {subtitle}
    </p>
  </motion.div>
);

/**
 * HowItWorksSection: New section explaining the app's process.
 */
const HowItWorksSection = () => (
  <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 pt-24 sm:px-10 scroll-mt-20">
    <SectionHeader
      title="How It Works"
      subtitle="A simple, seamless experience. See how SAYANA turns silence into expression in three easy steps."
    />
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-8"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {howItWorksSteps.map((step, index) => (
        <motion.div
          key={index}
          className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/60 shadow-xl shadow-green-300/20 backdrop-blur-lg"
          variants={cardVariants}
        >
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-green-100/50 mb-6">
            <FeatureIcon type={step.icon} className="w-12 h-12 text-[#603B2A] z-10" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-[#4a2e1f]">
            {step.title}
          </h3>
          <p className="text-[#603B2A]/80">
            {step.description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  </section>
);

/**
 * TechnologySection: New section detailing the AI technology.
 */
const TechnologySection = ({ onGetStartedClick }) => {
  const [activeTab, setActiveTab] = useState('emotion');

  return (
    <section className="w-full bg-green-100/30 mt-24 py-24">
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10">
        <SectionHeader
          title="Our Technology"
          subtitle="Powered by cutting-edge AI, SAYANA is built on empathy and precision. Explore the models that make communication possible."
        />
        <div className="flex justify-center mb-12">
          <div className="flex p-1 rounded-full bg-green-100/50">
            <button
              onClick={() => setActiveTab('emotion')}
              className={`px-6 sm:px-10 py-3 text-sm sm:text-base font-semibold rounded-full transition-colors ${activeTab === 'emotion' ? 'bg-white text-[#603B2A] shadow-md' : 'text-[#603B2A]/70 hover:text-[#603B2A]'}`}
            >
              AI Emotion Detection
            </button>
            <button
              onClick={() => setActiveTab('translation')}
              className={`px-6 sm:px-10 py-3 text-sm sm:text-base font-semibold rounded-full transition-colors ${activeTab === 'translation' ? 'bg-white text-[#603B2A] shadow-md' : 'text-[#603B2A]/70 hover:text-[#603B2A]'}`}
            >
              Sign Language Translation
            </button>
          </div>
        </div>

        {/* REBUILT CONTENT AREA: Replaced grid with a single animated container */}
        <div className="relative w-full min-h-[450px]">
          <AnimatePresence mode="wait">
            {activeTab === 'emotion' && (
              <motion.div
                key="emotion-content"
                className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-8 sm:p-12 rounded-3xl bg-white/60 shadow-xl shadow-green-300/20 backdrop-blur-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Text for Emotion */}
                <div>
                  <h3 className="text-3xl font-bold text-[#4a2e1f] mb-4">Understanding the Unspoken</h3>
                  <p className="text-lg text-[#603B2A]/80 mb-6">
                    Communication is more than just words. Our neural network analyzes facial landmarks to interpret the emotional context behind the sign or expression. This means SAYANA doesn't just translate what you say, but also how you feel.
                  </p>
                  {/* Corrected feature list for Emotion */}
                  <ul className="space-y-3">
                    <li className="flex items-center text-[#603B2A]"><span className="w-5 h-5 mr-3 rounded-full bg-[#603B2A] text-white flex items-center justify-center text-xs">✔</span>Live analysis via secure API keys</li>
                    <li className="flex items-center text-[#603B2A]"><span className="w-5 h-5 mr-3 rounded-full bg-[#603B2A] text-white flex items-center justify-center text-xs">✔</span>Trained on diverse, global datasets</li>
                    <li className="flex items-center text-[#603B2A]"><span className="w-5 h-5 mr-3 rounded-full bg-[#603B2A] text-white flex items-center justify-center text-xs">✔</span>Subtle expression recognition (happy, sad, etc.)</li>
                  </ul>
                  <motion.button
                    onClick={onGetStartedClick}
                    className="mt-8 rounded-full bg-[#603B2A] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#603B2A]/30 transition-all"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={buttonSpring}
                  >
                    Get Started
                  </motion.button>
                </div>
                {/* Icon for Emotion */}
                <motion.div
                  className="flex items-center justify-center min-h-[250px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <FeatureIcon type="tech-emotion" className="w-48 h-48 text-[#603B2A]/60" />
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'translation' && (
              <motion.div
                key="translation-content"
                className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-8 sm:p-12 rounded-3xl bg-white/60 shadow-xl shadow-green-300/20 backdrop-blur-lg"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Icon for Translation (reversed order for visual interest) */}
                <motion.div
                  className="flex items-center justify-center min-h-[250px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <FeatureIcon type="tech-sign" className="w-48 h-48 text-[#603B2A]/60" />
                </motion.div>
                {/* Text for Translation */}
                <div>
                  <h3 className="text-3xl font-bold text-[#4a2e1f] mb-4">Bridging Worlds with ISL</h3>
                  <p className="text-lg text-[#603B2A]/80 mb-6">
                    Our translation engine is built with a deep understanding of ISL (Indian Sign Language). It translates signs to voice/text and vice-versa in real time.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center text-[#603B2A]"><span className="w-5 h-5 mr-3 rounded-full bg-[#603B2A] text-white flex items-center justify-center text-xs">✔</span>Supports ISL</li>
                    <li className="flex items-center text-[#603B2A]"><span className="w-5 h-5 mr-3 rounded-full bg-[#603B2A] text-white flex items-center justify-center text-xs">✔</span>Context-aware translation engine</li>
                    <li className="flex items-center text-[#603B2A]"><span className="w-5 h-5 mr-3 rounded-full bg-[#603B2A] text-white flex items-center justify-center text-xs">✔</span>Speech-to-sign generation</li>
                  </ul>
                  <motion.button
                    onClick={onGetStartedClick}
                    className="mt-8 rounded-full bg-[#603B2A] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#603B2A]/30 transition-all"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={buttonSpring}
                  >
                    Get Started
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* End of rebuilt content area */}

      </div>
    </section>
  );
};

/**
 * TestimonialCard: A single card for the testimonials section.
 */
const TestimonialCard = ({ name, role, quote, stars }) => (
  <motion.div
    className="flex-shrink-0 w-[300px] sm:w-[350px] p-8 rounded-3xl bg-white/60 shadow-xl shadow-green-300/20 backdrop-blur-lg"
    // variants, initial, whileInView, and viewport props removed
  >
    <div className="flex mb-4">
      {[...Array(stars)].map((_, i) => (
        <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
      ))}
    </div>
    <p className="text-lg text-[#603B2A] mb-6 italic">"{quote}"</p>
    <div>
      <h4 className="text-lg font-bold text-[#4a2e1f]">{name}</h4>
      <p className="text-sm text-[#603B2A]/70">{role}</p>
    </div>
  </motion.div>
);

/**
 * TestimonialsSection: New section with scrolling user testimonials.
 */
const TestimonialsSection = () => {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 pt-24 sm:px-10 overflow-hidden">
      <SectionHeader
        title="Loved by Our Community"
        subtitle="Don't just take our word for it. Hear from the families, educators, and users who are part of the SAYANA story."
      />
      <motion.div className="w-full">
        <motion.div
          className="flex gap-8 pb-8" // Removed overflow-x-auto py-4
          animate={{ x: ["0%", "-50%"] }} // Added animate
          transition={{ // Added transition
            duration: 40,
            ease: "linear",
            repeat: Infinity,
            repeatType: "mirror" // UPDATED from loop to mirror
          }}
        >
          {[...testimonials, ...testimonials].map((testimonial, index) => ( // Added duplication
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

/**
 * MissionSection: New section for the company's mission.
 */
const MissionSection = () => (
  <section className="w-full bg-green-100/30 mt-24 py-24">
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 grid md:grid-cols-2 gap-12 items-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeIn}
      >
        <h2 className="text-4xl sm:text-5xl font-extrabold text-[#4a2e1f] mb-6">Our Mission</h2>
        <p className="text-lg text-[#603B2A]/80 mb-4">
          At SAYANA, our mission is to build a world where every voice, whether spoken, signed, or expressed, is heard and understood. We believe in the power of technology to break down barriers, not build new ones.
        </p>
        <p className="text-lg text-[#603B2A]/80">
          We are committed to creating empathetic, accessible, and secure tools that empower the deaf and mute communities, fostering deeper connections and enabling universal communication. Silence speaks, and we're here to translate.
        </p>
      </motion.div>
      <motion.div
        className="flex items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <HandSignIcon type="love" className="w-48 h-48 sm:w-64 sm:h-64 text-[#603B2A]/60" />
      </motion.div>
    </div>
  </section>
);

/**
 * FAQItem: An accordion item for the FAQ section.
 */
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="border-b border-green-200/50"
      variants={fadeIn}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-6 text-left"
      >
        <h3 className="text-lg font-semibold text-[#4a2e1f]">{question}</h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDownIcon className="w-6 h-6 text-[#603B2A]/70" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-[#603B2A]/80">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * FAQSection: New section for frequently asked questions.
 */
const FAQSection = () => (
  <section className="w-full max-w-4xl mx-auto px-6 pt-24 sm:px-10">
    <SectionHeader
      title="Frequently Asked Questions"
      subtitle="Have questions? We have answers. Find out more about the most common inquiries about SAYANA."
    />
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {faqData.map((faq, index) => (
        <FAQItem key={index} question={faq.question} answer={faq.answer} />
      ))}
    </motion.div>
  </section>
);

/* CTASection removed — authentication will be provided separately. */

/**
 * Chatbot: Floating chat component.
 */
const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I\'m Sayan, the SAYANA assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const systemPrompt = "You are 'Sayan,' the friendly and helpful chatbot for SAYANA. SAYANA is an application that empowers deaf and mute users through AI-powered emotion detection, real-time sign language translation, secure conversations, and multilingual support. Your *only* job is to answer questions about SAYANA's features, accessibility, technology, and mission. Be empathetic, clear, and concise. **Strictly refuse to answer any questions or engage in any conversation that is not about SAYANA.** If asked about anything else, politely redirect the user back to SAYANA's features. For example: 'I'm here to help with any questions you have about SAYANA. How can I tell you more about our AI translation features?'";
    
    const userQuery = input;
    const apiKey = ""; // API key is handled by the environment
    const apiUrl = `https://generativelaanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
          // Build a minimal history to keep context
          ...messages.slice(-4).map(msg => ({
            role: msg.from === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          })),
          { role: 'user', parts: [{ text: userQuery }] }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        const result = await fetchWithBackoff(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const candidate = result?.candidates?.[0];
        if (candidate && candidate.content?.parts?.[0]?.text) {
            const botResponse = { from: 'bot', text: candidate.content.parts[0].text };
            setMessages(prev => [...prev, botResponse]);
        } else {
            console.error("API response missing content:", result);
            const errorResponse = { from: 'bot', text: "Sorry, I'm having a little trouble. Could you try asking that again?" };
            setMessages(prev => [...prev, errorResponse]);
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        const errorResponse = { from: 'bot', text: "I seem to be having connection issues. Please try again in a moment." };
        setMessages(prev => [...prev, errorResponse]);
    } finally {
        setIsLoading(false);
    }
  };

  // animation variants for messages
  const messageVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  return (
    <>
      {/* Chat Bubble */}
      <motion.button
        className="fixed z-50 bottom-8 right-8 w-16 h-16 rounded-full bg-[#603B2A] text-white shadow-lg flex items-center justify-center"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <ChatIcon className="w-8 h-8" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed z-50 bottom-28 right-8 w-full max-w-md h-[70vh] max-h-[600px] bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-xl">
                  <span role="img" aria-label="ai">🤖</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#4a2e1f]">SAYANA</div>
                  <div className="text-sm text-[#4a2e1f]/70">Assistant</div>
                  <div className="mt-1 flex items-center text-sm text-[#4a2e1f]/70">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2" aria-hidden></span>
                    <span className="font-semibold text-[#2f6f45]">ONLINE</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                title="Close"
                className="text-[#4a2e1f] hover:text-[#603B2A] bg-white/60 rounded-full p-2 shadow-sm"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  animate="visible"
                  variants={messageVariants}
                  transition={{ duration: 0.18, delay: index * 0.02 }}
                  className={`flex items-end ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.from === 'bot' && (
                    <div className="mr-3 flex-shrink-0 text-lg">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[#4a2e1f] font-semibold">🤖</div>
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm transition-transform hover:scale-[1.01] ${
                      msg.from === 'user'
                        ? 'bg-[#603B2A] text-white rounded-br-lg rounded-tl-lg'
                        : 'bg-green-50 text-neutral-800 rounded-bl-lg rounded-tr-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {msg.from === 'user' && (
                    <div className="ml-3 flex-shrink-0 text-lg">
                      <div className="w-8 h-8 rounded-full bg-[#603B2A] flex items-center justify-center text-white">👤</div>
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div className="flex items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mr-3 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[#4a2e1f] font-semibold">S</div>
                  </div>
                  <div className="max-w-xs px-4 py-3 rounded-2xl bg-green-50 text-neutral-800 rounded-bl-lg">
                    <div className="flex items-center gap-2">
                      <motion.div className="w-2 h-2 bg-green-300 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0 }} />
                      <motion.div className="w-2 h-2 bg-green-300 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.15 }} />
                      <motion.div className="w-2 h-2 bg-green-300 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.3 }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2 items-center flex-nowrap">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                  placeholder="Ask about SAYANA..."
                  className="flex-1 min-w-0 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#603B2A]/50"
                  disabled={isLoading}
                />
                <motion.button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-12 h-12 rounded-full bg-[#cbb9b0] text-white flex items-center justify-center disabled:opacity-50 border border-[#bfae9f] shadow-sm hover:shadow-md"
                  title="Send message"
                  aria-label="Send message"
                  whileHover={{ scale: isLoading ? 1 : 1.06 }}
                  whileTap={{ scale: isLoading ? 1 : 0.95 }}
                >
                  <SendIcon className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


// --- Main App Component ---

export default function App() {
  const mainRef = useRef(null);

  const handleMouseMove = (e) => {
    if (mainRef.current) {
      const { clientX, clientY } = e;
      const { offsetLeft, offsetTop } = mainRef.current;
      mainRef.current.style.setProperty('--x', `${clientX - offsetLeft}px`);
      mainRef.current.style.setProperty('--y', `${clientY - offsetTop}px`);
    }
  };

  // --- Button Click Handlers ---

  // Navigate to authentication page (signin / signup). The real auth pages
  // will be provided later; we use a simple client-side redirect to `/auth`.
  const handleGetStarted = () => {
    // If we're inside a Router, prefer client-side navigation.
    try {
      navigate('/auth');
    } catch (e) {
      window.location.href = '/auth';
    }
  };

  const navigate = useNavigate();

  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={(
        <div
      ref={mainRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-green-50 via-green-100 to-green-50 font-sans text-neutral-800"
    >
      {/* Background Glowing Wave (Cursor Effect) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-500"
        style={{
          background: 'radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), rgba(134, 239, 172, 0.1), transparent 40%)'
        }}
      />

      {/* Background Floating Icons */}
      <div className="absolute inset-0 z-0">
        {floatingIcons.map((item) => (
          <motion.div
            key={item.id}
            className="absolute text-green-300"
            style={{
              top: item.top,
              left: item.left,
              width: item.size,
              height: item.size,
            }}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="w-full px-6 sm:px-10 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="text-3xl font-bold text-[#603B2A]">
              SAYANA
            </div>
            <motion.button
              onClick={handleGetStarted}
              className="hidden sm:block rounded-full bg-white/70 px-6 py-2.5 text-sm font-semibold text-[#603B2A] shadow-lg shadow-gray-300/20 backdrop-blur-lg transition-all"
              whileHover={{ scale: 1.05, shadow: "0px 5px 20px rgba(96, 59, 42, 0.2)" }}
              whileTap={{ scale: 0.95 }}
              transition={buttonSpring}
            >
              Get Started
            </motion.button>
          </motion.div>
        </header>

        {/* Hero Section */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 text-center min-h-[calc(100vh-100px)] pt-20 pb-32">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl font-extrabold tracking-tight text-[#4a2e1f] sm:text-6xl md:text-8xl"
          >
            Where Silence Speaks
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-4 max-w-xl text-lg text-[#603B2A]/80 sm:text-2xl"
          >
            Empowering expression beyond sound and words
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <motion.button
              onClick={handleGetStarted}
              className="rounded-full bg-[#603B2A] px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-[#603B2A]/30 transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={buttonSpring}
            >
              Get Started
            </motion.button>
            <motion.button
              onClick={() => handleScrollTo('how-it-works')}
              className="rounded-full bg-white/70 px-10 py-4 text-lg font-semibold text-[#603B2A] shadow-lg shadow-gray-300/20 backdrop-blur-lg transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={buttonSpring}
            >
              How It Works
            </motion.button>
          </motion.div>
        </main>

        {/* Features Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-16 pb-24 sm:px-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="mx-auto mb-16 max-w-3xl text-center text-xl text-[#603B2A]/90"
          >
            SAYANA bridges emotion and understanding through AI-powered sign and facial translation — making silence heard worldwide.
          </motion.p>
          
          <motion.div
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="flex flex-col items-center rounded-3xl bg-white/60 p-8 text-center shadow-xl shadow-green-300/20 backdrop-blur-lg sm:items-start sm:text-left"
                variants={cardVariants}
              >
                <FeatureIcon type={feature.icon} />
                <h3 className="mb-3 text-2xl font-bold text-[#4a2e1f]">
                  {feature.title}
                </h3>
                <p className="text-[#603B2A]/80">
                  {feature.description}
                </p>
                {/* Demo button removed from here */}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* --- NEW SECTIONS ADDED --- */}

  <HowItWorksSection />

  <TechnologySection onGetStartedClick={handleGetStarted} />

  <TestimonialsSection />

  <MissionSection />

  <FAQSection />

        {/* --- END OF NEW SECTIONS --- */}


        {/* Footer */}
        <footer className="py-10 text-center text-green-600">
          © {new Date().getFullYear()} SAYANA. All rights reserved.
        </footer>
      </div>

          {/* Chatbot Component */}
          <Chatbot />

          {/* Gemini Demo Modal Removed */}
        </div>
      )} />
    </Routes>
  );
}
