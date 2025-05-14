import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
	try {
		const result = await cloudinary.uploader.upload(file.tempFilePath, {
			resource_type: "auto",
		});
		return result.secure_url;
	} catch (error) {
		console.log("Error in uploadToCloudinary", error);
		throw new Error("Error uploading to cloudinary");
	}
};

export const createSong = async (req, res, next) => {
	try {
		if (!req.files || !req.files.audioFile || !req.files.imageFile) {
			return res.status(400).json({ message: "Please upload all files" });
		}

		const { title, artist, albumId, duration } = req.body;
		const audioFile = req.files.audioFile;
		const imageFile = req.files.imageFile;

		const audioUrl = await uploadToCloudinary(audioFile);
		const imageUrl = await uploadToCloudinary(imageFile);

		const song = new Song({
			title,
			artist,
			audioUrl,
			imageUrl,
			duration,
			albumId: albumId || null,
		});

		await song.save();

		// if song belongs to an album, update the album's songs array
		if (albumId) {
			await Album.findByIdAndUpdate(albumId, {
				$push: { songs: song._id },
			});
		}
		res.status(201).json(song);
	} catch (error) {
		console.log("Error in createSong", error);
		next(error);
	}
};

export const deleteSong = async (req, res, next) => {
	try {
		const { id } = req.params;

		const song = await Song.findById(id);

		// if song belongs to an album, update the album's songs array
		if (song.albumId) {
			await Album.findByIdAndUpdate(song.albumId, {
				$pull: { songs: song._id },
			});
		}

		await Song.findByIdAndDelete(id);

		res.status(200).json({ message: "Song deleted successfully" });
	} catch (error) {
		console.log("Error in deleteSong", error);
		next(error);
	}
};

export const createAlbum = async (req, res, next) => {
	try {
		const { title, artist, releaseYear } = req.body;
		const { imageFile } = req.files;

		const imageUrl = await uploadToCloudinary(imageFile);

		const album = new Album({
			title,
			artist,
			imageUrl,
			releaseYear,
		});

		await album.save();

		res.status(201).json(album);
	} catch (error) {
		console.log("Error in createAlbum", error);
		next(error);
	}
};

export const deleteAlbum = async (req, res, next) => {
	try {
		const { id } = req.params;
		await Song.deleteMany({ albumId: id });
		await Album.findByIdAndDelete(id);
		res.status(200).json({ message: "Album deleted successfully" });
	} catch (error) {
		console.log("Error in deleteAlbum", error);
		next(error);
	}
};

export const checkAdmin = async (req, res, next) => {
	res.status(200).json({ admin: true });
};

export const handleUpload = async (req, res, next) => {
	try {
		const audioFiles = req.files?.audioFiles; // Assuming audio files are sent under the key 'audioFiles'
		const imageFile = req.files?.imageFile; // Assuming image file is sent under the key 'imageFile'
		const { albumDetails, singleSongDetails, albumSongsDetails } = req.body; // Assuming these are sent in the request body

		if (!audioFiles) {
			return res.status(400).json({ message: "No audio files uploaded" });
		}

		if (Array.isArray(audioFiles)) {
			// Multiple audio files - create an album
			if (!imageFile || !albumDetails) {
				return res.status(400).json({ message: "Missing image or album details for album upload" });
			}

			const imageUrl = await uploadToCloudinary(imageFile);

			const parsedAlbumDetails = JSON.parse(albumDetails); // Parse albumDetails JSON
			const parsedAlbumSongsDetails = JSON.parse(albumSongsDetails); // Parse albumSongsDetails JSON
			console.log("Parsed albumSongsDetails:", parsedAlbumSongsDetails); // Log parsed albumSongsDetails

			const album = new Album({
				title: parsedAlbumDetails.title,
				artist: parsedAlbumDetails.artist,
				imageUrl,
				releaseDate: new Date(parsedAlbumDetails.releaseDate), // Use releaseDate and convert to Date
				generalGenre: parsedAlbumDetails.generalGenre, // Include generalGenre
				specificGenres: parsedAlbumDetails.specificGenres, // Include specificGenres
			});

			await album.save();

			const songIds = [];
			for (const [index, audioFile] of audioFiles.entries()) {
				const audioUrl = await uploadToCloudinary(audioFile);
				const songDetails = parsedAlbumSongsDetails[index]; // Get details for the specific song from parsed data
				console.log(`Processing song ${index}:`, songDetails); // Log song details
				console.log(`Song title: ${songDetails.title}`); // Log song title

				const song = new Song({
					title: songDetails.title,
					artist: parsedAlbumDetails.artist, // Assuming album artist for all songs in album
					audioUrl,
					imageUrl, // Using album image for songs in album
					duration: 0, // TODO: Get actual duration
					albumId: album._id,
					generalGenre: parsedAlbumDetails.generalGenre, // Include generalGenre for songs
					specificGenres: parsedAlbumDetails.specificGenres, // Include specificGenres for songs
				});

				await song.save();
				songIds.push(song._id);
			}

			// Update album with song IDs
			album.songs = songIds;
			await album.save();

			res.status(201).json(album);

		} else {
			// Single audio file - create a single song
			if (!imageFile || !singleSongDetails) {
				return res.status(400).json({ message: "Missing image or song details for single song upload" });
			}

			const audioUrl = await uploadToCloudinary(audioFiles); // audioFiles is a single file here
			const imageUrl = await uploadToCloudinary(imageFile);

			const song = new Song({
				title: singleSongDetails.title,
				artist: singleSongDetails.artist,
				audioUrl,
				imageUrl,
				duration: 0, // TODO: Get actual duration
				albumId: null,
			});

			await song.save();

			res.status(201).json(song);
		}

	} catch (error) {
		console.log("Error in handleUpload", error);
		next(error);
	}
};
