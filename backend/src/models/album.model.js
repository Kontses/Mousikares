import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		artist: { type: String, required: true },
		imageUrl: { type: String, required: true },
		releaseDate: { type: Date, required: true }, // Changed to Date
		generalGenre: { type: String }, // Added generalGenre
		specificGenres: [{ type: String }], // Added specificGenres as an array of strings
		description: { type: String }, // Added description field
		songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
	},
	{ timestamps: true }
); //  createdAt, updatedAt

export const Album = mongoose.model("Album", albumSchema);
