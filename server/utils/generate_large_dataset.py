import json
import random

# Base questions and topics for variation
topics = [
    "machine learning fundamentals",
    "supervised learning", 
    "unsupervised learning",
    "reinforcement learning",
    "deep learning",
    "neural networks",
    "computer vision",
    "natural language processing",
    "optimization",
    "model evaluation",
    "data preprocessing",
    "feature engineering",
    "ensemble methods",
    "dimensionality reduction",
    "time series analysis",
    "clustering",
    "classification",
    "regression",
    "probability and statistics",
    "linear algebra",
    "calculus for ML",
    "data mining",
    "big data",
    "MLOps",
    "model deployment",
    "ethics in AI",
    "explainable AI",
    "transfer learning",
    "few-shot learning",
    "meta-learning",
    "graph neural networks",
    "generative models",
    "adversarial learning",
    "federated learning",
    "continual learning",
    "multi-task learning",
    "representation learning",
    "self-supervised learning",
    "semi-supervised learning",
    "active learning",
    "online learning"
]

difficulties = ["easy", "medium", "hard"]

sample_comments = [
    "", "", "", "", "",  # Empty comments (more common)
    "Good explanation",
    "Need more details",
    "Very helpful",
    "Could be clearer",
    "Excellent answer",
    "asdfasdf",
    "xyz123",
    "test comment",
    "needs revision",
    "perfect",
    "unclear",
    "well explained",
    "comprehensive",
    "brief but good",
    "detailed answer"
]

# Specific ML concepts for more realistic content
ml_concepts = [
    "gradient descent", "backpropagation", "convolutional neural networks", "recurrent neural networks",
    "random forests", "support vector machines", "k-means clustering", "principal component analysis",
    "linear regression", "logistic regression", "decision trees", "naive bayes", "k-nearest neighbors",
    "neural networks", "deep learning", "autoencoders", "generative adversarial networks",
    "transformer models", "attention mechanisms", "LSTM networks", "batch normalization",
    "dropout regularization", "early stopping", "cross-validation", "hyperparameter tuning",
    "feature selection", "data augmentation", "transfer learning", "ensemble learning",
    "bagging and boosting", "bias-variance tradeoff", "overfitting and underfitting",
    "precision and recall", "ROC curves", "confusion matrices", "learning curves",
    "activation functions", "loss functions", "optimization algorithms", "learning rate scheduling",
    "dimensionality reduction", "clustering algorithms", "classification metrics", "regression metrics",
    "natural language processing", "computer vision", "reinforcement learning", "Q-learning",
    "policy gradient methods", "actor-critic models", "word embeddings", "sentiment analysis",
    "image classification", "object detection", "semantic segmentation", "style transfer",
    "recommender systems", "collaborative filtering", "matrix factorization", "time series forecasting"
]

def generate_question_answer(concept, topic, difficulty):
    """Generate a question and answer for a given concept"""
    
    # Create more specific content based on concept
    if "neural network" in concept.lower():
        question = f"What is {concept} and how does it work in deep learning?"
        answer = f"{concept.title()} is a type of neural network architecture that processes data through multiple layers of interconnected nodes. It works by applying mathematical transformations to input data, learning patterns through backpropagation, and optimizing weights to minimize prediction errors. This approach is particularly effective for complex pattern recognition tasks."
    elif "clustering" in concept.lower():
        question = f"Explain {concept} and its applications."
        answer = f"{concept.title()} is an unsupervised learning technique that groups similar data points together. It works by identifying patterns in data without labeled examples, using distance metrics or probability distributions to form clusters. Common applications include customer segmentation, data exploration, and anomaly detection."
    elif "regression" in concept.lower():
        question = f"What is {concept} and when should it be used?"
        answer = f"{concept.title()} is a supervised learning method for predicting continuous numerical values. It models the relationship between input features and target variables by finding the best-fitting line or curve. It's used when the output is a continuous quantity like prices, temperatures, or probabilities."
    elif "gradient descent" in concept.lower():
        question = f"How does {concept} work in machine learning optimization?"
        answer = f"{concept.title()} is an optimization algorithm used to minimize loss functions by iteratively moving in the direction of steepest descent. It calculates gradients of the loss function with respect to model parameters and updates them to find optimal values. This process is fundamental to training most machine learning models."
    elif "deep learning" in concept.lower():
        question = f"What is {concept} and how does it differ from traditional machine learning?"
        answer = f"{concept.title()} is a subset of machine learning that uses artificial neural networks with multiple layers to learn complex patterns in data. Unlike traditional ML, it can automatically learn hierarchical feature representations from raw data, making it particularly effective for tasks like image recognition, natural language processing, and speech recognition."
    elif "reinforcement learning" in concept.lower():
        question = f"Explain {concept} and its key components."
        answer = f"{concept.title()} is a type of machine learning where an agent learns to make decisions by interacting with an environment and receiving rewards or penalties. Key components include the agent, environment, actions, states, and reward function. The agent learns optimal policies through trial and error to maximize cumulative rewards."
    elif "cross-validation" in concept.lower():
        question = f"What is {concept} and why is it important?"
        answer = f"{concept.title()} is a technique for evaluating model performance by partitioning data into multiple folds, training on some and testing on others. This provides a more robust estimate of how well a model will generalize to unseen data and helps detect overfitting or underfitting issues."
    elif "feature" in concept.lower():
        question = f"What is {concept} in machine learning?"
        answer = f"{concept.title()} refers to the process of selecting, modifying, or creating input variables to improve model performance. This includes techniques like normalization, encoding categorical variables, creating interaction terms, and removing irrelevant features. Good feature engineering can significantly impact model accuracy."
    elif "ensemble" in concept.lower():
        question = f"How do {concept} methods work?"
        answer = f"{concept.title()} methods combine predictions from multiple models to create a stronger predictor than any individual model alone. They work by reducing bias, variance, or both through techniques like voting, averaging, or stacking. Popular examples include Random Forest and Gradient Boosting."
    else:
        # Generic template for other concepts
        templates = [
            f"What is {concept} in machine learning?",
            f"How does {concept} work?",
            f"Explain the concept of {concept}.",
            f"What are the applications of {concept}?",
            f"When should you use {concept}?"
        ]
        question = random.choice(templates)
        
        answer = f"{concept.title()} is an important concept in machine learning that helps solve various computational problems. It involves analyzing data patterns and applying mathematical algorithms to extract meaningful insights. This technique is widely used in data science applications and has proven effective for improving model performance and accuracy."
    
    return question, answer

def generate_dataset(size=5000):
    """Generate a dataset of specified size"""
    dataset = []
    
    for i in range(size):
        # Select random concept and topic
        concept = random.choice(ml_concepts)
        topic = random.choice(topics)
        difficulty = random.choice(difficulties)
        
        # Generate question and answer
        question, answer = generate_question_answer(concept, topic, difficulty)
        
        # Generate other fields
        rating = random.randint(1, 5)
        quality_score = random.randint(5, 9)
        comment = random.choice(sample_comments)
        
        record = {
            "question": question,
            "answer": answer,
            "difficulty": difficulty,
            "topic": topic,
            "id": i,
            "rating": rating,
            "quality_score": quality_score,
            "comment": comment
        }
        
        dataset.append(record)
    
    return dataset

if __name__ == "__main__":
    # Generate 5000 records
    print("Generating 5000 machine learning Q&A records...")
    large_dataset = generate_dataset(5000)
    
    # Save to JSON file
    with open('public/dataset.json', 'w', encoding='utf-8') as f:
        json.dump(large_dataset, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Generated dataset with {len(large_dataset)} records")
    print(f"📄 File saved to: public/dataset.json")
    print(f"📊 Sample record:")
    print(json.dumps(large_dataset[0], indent=2)) 