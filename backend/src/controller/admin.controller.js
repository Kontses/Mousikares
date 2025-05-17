import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file, folder, publicId = null, resourceType = "auto") => {
	try {
		const options = {
			resource_type: resourceType, // Use the resourceType parameter here
			folder: folder, // Add the folder parameter here
		};
		if (publicId) {
			options.public_id = publicId;
		}
		const result = await cloudinary.uploader.upload(file.tempFilePath, options);
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

			const parsedAlbumDetails = JSON.parse(albumDetails); // Parse albumDetails JSON
			const parsedAlbumSongsDetails = JSON.parse(albumSongsDetails); // Parse albumSongsDetails JSON
			console.log("Parsed albumSongsDetails:", parsedAlbumSongsDetails); // Log parsed albumSongsDetails

			// Construct the new image public ID with the desired naming convention
			const uploadDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
			const artistName = parsedAlbumDetails.artist;
			const albumTitle = parsedAlbumDetails.title;
			const newImagePublicId = `${uploadDate}_${artistName}_${albumTitle}`;
			const albumFolder = `laterna/artists/${artistName}/${albumTitle}`;


			const imageUrl = await uploadToCloudinary(imageFile, albumFolder, newImagePublicId); // Upload image with the new public ID and folder

			let album;
			// Check if an album with the same title and artist already exists
			const existingAlbum = await Album.findOne({
				title: parsedAlbumDetails.title,
				artist: parsedAlbumDetails.artist,
			});

			if (existingAlbum) {
				console.log(`Existing album found: ${existingAlbum.title} by ${existingAlbum.artist}. Overwriting.`);
				// If existing album found, update it
				album = existingAlbum;
				album.imageUrl = imageUrl;
				album.releaseDate = new Date(parsedAlbumDetails.releaseDate);
				album.generalGenre = parsedAlbumDetails.generalGenre;
				album.specificGenres = parsedAlbumDetails.specificGenres;
				// Clear existing songs
				await Song.deleteMany({ albumId: album._id });
				album.songs = []; // Clear song references in the album
			} else {
				console.log(`No existing album found. Creating a new album: ${parsedAlbumDetails.title} by ${parsedAlbumDetails.artist}.`);
				// If no existing album found, create a new one
				album = new Album({
					title: parsedAlbumDetails.title,
					artist: parsedAlbumDetails.artist,
					imageUrl,
					releaseDate: new Date(parsedAlbumDetails.releaseDate),
					generalGenre: parsedAlbumDetails.generalGenre,
					specificGenres: parsedAlbumDetails.specificGenres,
				});
			}

			await album.save(); // Save the new or updated album

			const songIds = [];
			// Iterate through parsedAlbumSongsDetails to maintain order
			for (const songDetails of parsedAlbumSongsDetails) {
				// Find the corresponding audio file using the fileName
				const audioFile = audioFiles.find(file => file.name === songDetails.fileName);

				if (!audioFile) {
					console.error(`Audio file not found for song: ${songDetails.fileName}`);
					// Depending on requirements, you might want to return an error or skip this song
					continue;
				}

				// Construct the song public ID with the desired naming convention
				const uploadDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
				const artistName = parsedAlbumDetails.artist;
				const songTitle = songDetails.title;
				const newSongPublicId = `${uploadDate}_${artistName}_${songTitle}`;

				const audioUrl = await uploadToCloudinary(audioFile, albumFolder, newSongPublicId, "video"); // Upload audio with the album folder, public ID, and resourceType "video"
				console.log(`Processing song:`, songDetails); // Log song details
				console.log(`Song title: ${songDetails.title}`); // Log song title


				const song = new Song({
					title: songDetails.title, // Use the original song title
					artist: artistName, // Assuming album artist for all songs in album
					audioUrl, // audioUrl already includes the public ID from uploadToCloudinary
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

			// Construct the new image public ID with the desired naming convention for single songs
			const uploadDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
			const artistName = singleSongDetails.artist;
			const songTitle = singleSongDetails.title;
			const newImagePublicId = `${uploadDate}_${artistName}_${songTitle}`;
			const artistFolder = `laterna/artists/${artistName}`;


			const imageUrl = await uploadToCloudinary(imageFile, artistFolder, newImagePublicId); // Upload image with the new public ID and folder

			// Construct the new song public ID with the desired naming convention for single songs
			const newSongPublicId = `${uploadDate}_${artistName}_${songTitle}`;

			const audioUrl = await uploadToCloudinary(audioFiles, artistFolder, newSongPublicId, "video"); // audioFiles is a single file here, upload with artist folder and public ID, and resourceType "video"

			const song = new Song({
				title: singleSongDetails.title, // Use the original song title from singleSongDetails
				artist: artistName,
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
