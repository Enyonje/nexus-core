import React, { useState } from "react";
import { Smile, Meh, Frown } from "lucide-react";

const ReviewPage = () => {
    const [rating, setRating] = useState(null);
    const [feedback, setFeedback] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: send rating + feedback to backend API
        console.log({ rating, feedback });
        alert("🎉 Thanks for your feedback!");
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
            <div className="max-w-md w-full text-center space-y-8 bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-xl shadow-lg">
                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    How’s your SupportOps experience?
                </h1>

                {/* Emoji Rating */}
                <div className="flex justify-center gap-6">
                    <button
                        type="button"
                        onClick={() => setRating("positive")}
                        className={`p-4 rounded-full border-2 ${rating === "positive" ? "border-green-500" : "border-transparent"
                            }`}
                    >
                        <Smile size={40} className="text-green-500" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setRating("neutral")}
                        className={`p-4 rounded-full border-2 ${rating === "neutral" ? "border-yellow-500" : "border-transparent"
                            }`}
                    >
                        <Meh size={40} className="text-yellow-500" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setRating("negative")}
                        className={`p-4 rounded-full border-2 ${rating === "negative" ? "border-red-500" : "border-transparent"
                            }`}
                    >
                        <Frown size={40} className="text-red-500" />
                    </button>
                </div>

                {/* Feedback Input */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us what stood out..."
                        className="w-full p-4 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                    />

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition"
                    >
                        Submit Feedback
                    </button>
                </form>

                {/* Status */}
                <p className="text-xs text-slate-400">
                    Your feedback helps us improve and celebrate wins 🚀
                </p>
            </div>
        </div>
    );
};

export default ReviewPage;
