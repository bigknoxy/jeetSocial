"""
Vector Store for Similarity Detection (Layer 3)
TF-IDF vectorization and cosine similarity for hate speech detection
"""

from typing import List, Dict, Tuple, Optional
import numpy as np

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    TfidfVectorizer = None
    cosine_similarity = None

from ..utils import HATEFUL_WORDS, normalize_text


class VectorStore:
    """Vector store for similarity-based hate speech detection"""

    def __init__(
        self,
        similarity_threshold: float = 0.85,
        max_features: int = 10000,
        ngram_range: Tuple[int, int] = (1, 3),
    ):
        """
        Initialize vector store

        Args:
            similarity_threshold: Threshold for similarity matching
            max_features: Maximum number of features for TF-IDF
            ngram_range: Range of n-grams for TF-IDF
        """
        self.similarity_threshold = similarity_threshold
        self.max_features = max_features
        self.ngram_range = ngram_range

        # Initialize TF-IDF vectorizer
        if TfidfVectorizer is not None:
            self.vectorizer = TfidfVectorizer(
                max_features=max_features,
                ngram_range=ngram_range,
                lowercase=True,
                stop_words="english",
                analyzer="word",
                token_pattern=r"\b\w+\b",
            )
        else:
            self.vectorizer = None

        # Seed hate speech vectors
        self.hate_vectors = []
        self.hate_texts = []
        self._initialize_seed_vectors()

    def _initialize_seed_vectors(self):
        """Initialize with seed hate speech vectors"""
        if self.vectorizer is None:
            return

        # Use existing hateful words as seed data
        seed_texts = []

        # Add individual hateful words
        for word in HATEFUL_WORDS:
            if " " not in word:  # Single words only for seeds
                seed_texts.append(word)
                # Add variations
                seed_texts.append(f"You are {word}")
                seed_texts.append(f"You're a {word}")
                seed_texts.append(f"{word} person")

        # Add multi-word phrases
        for phrase in HATEFUL_WORDS:
            if " " in phrase:
                seed_texts.append(phrase)

        # Fit vectorizer and transform seed texts
        if seed_texts:
            try:
                # Fit vectorizer on seed texts
                self.vectorizer.fit(seed_texts)

                # Transform and store vectors
                seed_vectors = self.vectorizer.transform(seed_texts)
                self.hate_vectors = seed_vectors.toarray()
                self.hate_texts = seed_texts

            except Exception as e:
                print(f"Error initializing seed vectors: {e}")
                # Fallback: empty vectors
                self.hate_vectors = []
                self.hate_texts = []

    def is_similar_to_hate(self, content: str) -> Tuple[bool, float, str]:
        """
        Check if content is similar to known hate speech

        Args:
            content: Content to analyze

        Returns:
            Tuple of (is_hate, similarity_score, reason)
        """
        if self.vectorizer is None or not self.hate_vectors.size:
            return False, 0.0, "vector_store_unavailable"

        try:
            # Normalize content
            normalized_content = normalize_text(content)

            # Transform content to vector
            content_vector = self.vectorizer.transform([normalized_content])
            content_array = content_vector.toarray()

            # Calculate similarity with all hate vectors
            similarities = cosine_similarity(content_array, self.hate_vectors)[0]

            # Find maximum similarity
            max_similarity = np.max(similarities)
            max_index = np.argmax(similarities)

            if max_similarity >= self.similarity_threshold:
                matched_text = self.hate_texts[max_index]
                reason = (
                    f"similar_to_hate ({max_similarity:.3f}) matched: '{matched_text}'"
                )
                return True, float(max_similarity), reason

            return False, float(max_similarity), "below_similarity_threshold"

        except Exception as e:
            print(f"Error in similarity detection: {e}")
            return False, 0.0, f"error: {str(e)}"

    def get_vector(self, content: str) -> Optional[List[float]]:
        """
        Get TF-IDF vector for content

        Args:
            content: Content to vectorize

        Returns:
            Vector as list of floats, or None if unavailable
        """
        if self.vectorizer is None:
            return None

        try:
            normalized_content = normalize_text(content)
            vector = self.vectorizer.transform([normalized_content])
            return vector.toarray()[0].tolist()
        except Exception as e:
            print(f"Error getting vector: {e}")
            return None

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0

        # Convert to numpy arrays
        v1 = np.array(vec1)
        v2 = np.array(vec2)

        # Calculate cosine similarity
        dot_product = np.dot(v1, v2)
        magnitude1 = np.linalg.norm(v1)
        magnitude2 = np.linalg.norm(v2)

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    def add_hate_example(self, content: str):
        """
        Add a new hate speech example to the vector store

        Args:
            content: New hate speech example
        """
        if self.vectorizer is None:
            return

        try:
            normalized_content = normalize_text(content)

            # Transform to vector
            vector = self.vectorizer.transform([normalized_content])
            vector_array = vector.toarray()

            # Add to hate vectors
            if self.hate_vectors.size == 0:
                self.hate_vectors = vector_array
            else:
                self.hate_vectors = np.vstack([self.hate_vectors, vector_array])

            self.hate_texts.append(normalized_content)

        except Exception as e:
            print(f"Error adding hate example: {e}")

    def get_stats(self) -> Dict[str, any]:
        """Get vector store statistics"""
        return {
            "seed_vectors_count": len(self.hate_texts),
            "similarity_threshold": self.similarity_threshold,
            "max_features": self.max_features,
            "ngram_range": self.ngram_range,
            "vectorizer_available": self.vectorizer is not None,
        }

    def update_threshold(self, new_threshold: float):
        """Update similarity threshold"""
        if 0.0 <= new_threshold <= 1.0:
            self.similarity_threshold = new_threshold
        else:
            raise ValueError("Threshold must be between 0.0 and 1.0")
