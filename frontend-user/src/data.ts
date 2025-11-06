// temporary file for static data

import { Book, Github, MessageCircle, Phone, Star, Trophy, Users, Video } from "lucide-react";

export const attachedDatasets = [
  {
    id: "1",
    name: "customer_reviews.csv",
    size: "2.4 MB",
    uploadDate: "Oct 5, 2025",
    type: "CSV",
    rows: "15,420",
    status: "Ready"
  },
  {
    id: "2",
    name: "product_images.zip",
    size: "128 MB",
    uploadDate: "Oct 3, 2025",
    type: "ZIP",
    rows: "3,200 files",
    status: "Processing"
  },
  {
    id: "3",
    name: "sales_data_2024.xlsx",
    size: "5.8 MB",
    uploadDate: "Oct 1, 2025",
    type: "Excel",
    rows: "28,640",
    status: "Ready"
  },
  {
    id: "4",
    name: "user_behavior.json",
    size: "1.2 MB",
    uploadDate: "Sep 30, 2025",
    type: "JSON",
    rows: "8,300",
    status: "Ready"
  }
];

export const faqItems = [
    {
      question: "How do I create a new project?",
      answer: "Click the 'New Project' button in the My Projects section and follow the setup wizard.",
      category: "Projects"
    },
    {
      question: "What file formats are supported for datasets?",
      answer: "We support CSV, JSON, Excel, Parquet, and compressed files (ZIP, TAR, GZ).",
      category: "Datasets"
    },
    {
      question: "How can I make my project public?",
      answer: "In your project settings, toggle the visibility switch from Private to Public.",
      category: "Projects"
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Profile Settings and scroll to the Danger Zone section.",
      category: "Account"
    },
    {
      question: "Can I collaborate with other users?",
      answer: "Yes, you can share projects and collaborate in real-time with team members.",
      category: "Collaboration"
    },
    {
      question: "What are the storage limits?",
      answer: "Free accounts get 5GB storage. Pro accounts get 100GB with unlimited projects.",
      category: "Account"
    }
  ];

export const quickActions = [
    {
      title: "Documentation",
      description: "Complete guides and API reference",
      icon: Book,
      href: "#",
      color: "blue"
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video walkthroughs",
      icon: Video,
      href: "#",
      color: "purple"
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: MessageCircle,
      href: "#",
      color: "green"
    },
    {
      title: "Contact Support",
      description: "Get help from our team",
      icon: Phone,
      href: "#",
      color: "orange"
    }
  ];

export const sampleProjects = [
  {
    id: "1",
    title: "Advanced Neural Network for Image Classification",
    description: "A comprehensive deep learning model using CNN architecture to classify images with 97% accuracy on the CIFAR-10 dataset.",
    author: "Sarah Kim",
    createdAt: "2 days ago",
    category: "Deep Learning",
    imageUrl: "https://images.unsplash.com/photo-1653564142048-d5af2cf9b50f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwc2NpZW5jZSUyMG1hY2hpbmUlMjBsZWFybmluZ3xlbnwxfHx8fDE3NTk3NjYyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "2",
    title: "Stock Market Prediction with LSTM",
    description: "Time series analysis using LSTM neural networks to predict stock prices with technical indicators and sentiment analysis.",
    author: "Michael Chen",
    createdAt: "1 week ago",
    category: "Finance",
    imageUrl: "https://images.unsplash.com/photo-1645839078449-124db8a049fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3NTk3MjU5MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "3",
    title: "Real-time Sales Dashboard Analytics",
    description: "Interactive dashboard showing real-time sales metrics, KPI tracking, and predictive analytics for business intelligence.",
    author: "Emma Rodriguez",
    createdAt: "3 days ago",
    category: "Analytics",
    imageUrl: "https://images.unsplash.com/photo-1744782211816-c5224434614f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwdmlzdWFsaXphdGlvbiUyMGNoYXJ0c3xlbnwxfHx8fDE3NTk2NTI3OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "4",
    title: "Computer Vision Object Detection",
    description: "YOLO-based object detection system for autonomous vehicles with real-time processing capabilities.",
    author: "David Park",
    createdAt: "5 days ago",
    category: "Computer Vision",
    imageUrl: "https://images.unsplash.com/photo-1649877508777-1554357604eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wdXRlciUyMHZpc2lvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzU5NzY2MjA1fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "5",
    title: "Customer Churn Prediction Model",
    description: "Machine learning model to predict customer churn using ensemble methods and feature engineering techniques.",
    author: "Lisa Johnson",
    createdAt: "1 week ago",
    category: "ML",
    imageUrl: "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmFseXRpY3MlMjBkYXNoYm9hcmR8ZW58MXx8fHwxNzU5NzQwODM4fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "6",
    title: "Natural Language Processing for Sentiment",
    description: "Transformer-based model for sentiment analysis of social media posts with multi-language support.",
    author: "James Wilson",
    createdAt: "4 days ago",
    category: "NLP",
    imageUrl: "https://images.unsplash.com/photo-1653564142048-d5af2cf9b50f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWVwJTIwbGVhcm5pbmclMjBjb2RlfGVufDF8fHx8MTc1OTc2NjIwNXww&ixlib=rb-4.1.0&q=80&w=1080"
  }
];

export const userProjects = [
  {
    id: "1",
    title: "Customer Sentiment Analysis Pipeline",
    description: "End-to-end ML pipeline for analyzing customer sentiment from reviews using BERT and custom preprocessing.",
    status: "Active",
    lastModified: "2 hours ago",
    createdAt: "Oct 1, 2025",
    category: "NLP",
    isPublic: true,
    imageUrl: "https://images.unsplash.com/photo-1653564142048-d5af2cf9b50f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwc2NpZW5jZSUyMG1hY2hpbmUlMjBsZWFybmluZ3xlbnwxfHx8fDE3NTk3NjYyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "2",
    title: "Real Estate Price Prediction",
    description: "Regression model to predict house prices using location, size, and market trends with XGBoost.",
    status: "Draft",
    lastModified: "1 day ago",
    createdAt: "Sep 28, 2025",
    category: "Regression",
    isPublic: false,
    imageUrl: "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmFseXRpY3MlMjBkYXNoYm9hcmR8ZW58MXx8fHwxNzU5NzQwODM4fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "3",
    title: "Medical Image Classification",
    description: "CNN model for classifying skin cancer from dermoscopy images with data augmentation techniques.",
    status: "Completed",
    lastModified: "3 days ago",
    createdAt: "Sep 20, 2025",
    category: "Computer Vision",
    isPublic: true,
    imageUrl: "https://images.unsplash.com/photo-1649877508777-1554357604eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wdXRlciUyMHZpc2lvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzU5NzY2MjA1fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "4",
    title: "Time Series Forecasting Dashboard",
    description: "Interactive dashboard for forecasting sales metrics using ARIMA and seasonal decomposition.",
    status: "Active",
    lastModified: "5 days ago",
    createdAt: "Sep 15, 2025",
    category: "Time Series",
    isPublic: false,
    imageUrl: "https://images.unsplash.com/photo-1744782211816-c5224434614f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwdmlzdWFsaXphdGlvbiUyMGNoYXJ0c3xlbnwxfHx8fDE3NTk2NTI3OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
  }
];

export const profileStats = {
    totalProjects: 12,
    publicProjects: 8,
    totalDatasets: 24,
    followers: 128,
    following: 45,
    contributions: 156
  };

export const recentActivity = [
    { type: "project", title: "Updated Customer Sentiment Analysis", date: "2 hours ago" },
    { type: "dataset", title: "Added sales_data_2024.xlsx", date: "1 day ago" },
    { type: "project", title: "Created Medical Image Classification", date: "3 days ago" },
    { type: "dataset", title: "Uploaded product_images.zip", date: "5 days ago" },
    { type: "project", title: "Shared Real Estate Price Prediction", date: "1 week ago" }
  ];

export const skills = [
    { name: "Machine Learning", level: 90 },
    { name: "Python", level: 95 },
    { name: "Data Visualization", level: 85 },
    { name: "Deep Learning", level: 80 },
    { name: "SQL", level: 88 },
    { name: "Statistics", level: 92 }
  ];

export const achievements = [
    { title: "Early Adopter", description: "Joined in the first month", icon: Trophy, color: "text-yellow-600" },
    { title: "Data Expert", description: "Completed 10+ projects", icon: Star, color: "text-blue-600" },
    { title: "Community Builder", description: "Helped 50+ users", icon: Users, color: "text-green-600" },
    { title: "Open Source", description: "5 public projects", icon: Github, color: "text-purple-600" }
  ];