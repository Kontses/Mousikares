import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/lib/axios";
import { Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react"; // Import useEffect
import toast from "react-hot-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Artist } from "@/types"; // Import Artist type

const AddAlbumDialog = () => {
	const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [artists, setArtists] = useState<Artist[]>([]); // State to store artists
	const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null); // State for selected artist ID

	const [newAlbum, setNewAlbum] = useState({
		title: "",
		releaseYear: new Date().getFullYear(),
		description: "",
	});

	const [imageFile, setImageFile] = useState<File | null>(null);

	useEffect(() => {
		const fetchArtists = async () => {
			try {
				const response = await axiosInstance.get("/api/artists");
				setArtists(response.data);
			} catch (error) {
				console.error("Error fetching artists:", error);
				toast.error("Failed to load artists.");
			}
		};
		fetchArtists();
	}, []);

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setImageFile(file);
		}
	};

	const handleSubmit = async () => {
		setIsLoading(true);

		try {
			if (!imageFile) {
				return toast.error("Please upload an image");
			}
			if (!selectedArtistId) {
				return toast.error("Please select an artist");
			}

			const formData = new FormData();
			formData.append("title", newAlbum.title);
			formData.append("artistId", selectedArtistId); // Send artistId instead of artist name
			formData.append("releaseYear", newAlbum.releaseYear.toString());
			formData.append("description", newAlbum.description);
			formData.append("imageFile", imageFile);

			await axiosInstance.post("/admin/albums", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			setNewAlbum({
				title: "",
				releaseYear: new Date().getFullYear(),
				description: "",
			});
			setImageFile(null);
			setSelectedArtistId(null); // Reset selected artist
			setAlbumDialogOpen(false);
			toast.success("Album created successfully");
		} catch (error: any) {
			toast.error("Failed to create album: " + error.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
			<DialogTrigger asChild>
				<Button className='bg-violet-500 hover:bg-violet-600 text-white'>
					<Plus className='mr-2 h-4 w-4' />
					Add Album
				</Button>
			</DialogTrigger>
			<DialogContent className='bg-zinc-900 border-zinc-700'>
				<DialogHeader>
					<DialogTitle>Add New Album</DialogTitle>
					<DialogDescription>Add a new album to your collection</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-[400px] px-4">
					<div className='space-y-4 py-4'>
						<input
							type='file'
							ref={fileInputRef}
							onChange={handleImageSelect}
							accept='image/*'
							className='hidden'
						/>
						<div
							className='flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer'
							onClick={() => fileInputRef.current?.click()}
						>
							<div className='text-center'>
								<div className='p-3 bg-zinc-800 rounded-full inline-block mb-2'>
									<Upload className='h-6 w-6 text-zinc-400' />
								</div>
								<div className='text-sm text-zinc-400 mb-2'>
									{imageFile ? imageFile.name : "Upload album artwork"}
								</div>
								<Button variant='outline' size='sm' className='text-xs'>
									Choose File
								</Button>
							</div>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Album Title</label>
							<Input
								value={newAlbum.title}
								onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
								className='bg-zinc-800 border-zinc-700'
								placeholder='Enter album title'
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Artist</label>
							<Select onValueChange={setSelectedArtistId} value={selectedArtistId || ""}>
								<SelectTrigger className="w-full bg-zinc-800 border-zinc-700">
									<SelectValue placeholder="Select an artist" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-800 border-zinc-700 text-white">
									{artists.map((artist) => (
										<SelectItem key={artist._id} value={artist._id}>
											{artist.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Release Year</label>
							<Input
								type='number'
								value={newAlbum.releaseYear}
								onChange={(e) => setNewAlbum({ ...newAlbum, releaseYear: parseInt(e.target.value) })}
								className='bg-zinc-800 border-zinc-700'
								placeholder='Enter release year'
								min={1900}
								max={new Date().getFullYear()}
							/>
						</div>
						{/* Description */}
						<div className='space-y-2'>
							<label htmlFor="description" className='text-sm font-medium'>Album Description</label>
							<textarea
								id="description"
								value={newAlbum.description}
								onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
								className='flex h-20 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm ring-offset-zinc-950 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]'
								placeholder='Enter album description'
							/>
						</div>
					</div>
				</ScrollArea>
				<DialogFooter>
					<Button variant='outline' onClick={() => setAlbumDialogOpen(false)} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						className='bg-violet-500 hover:bg-violet-600'
						disabled={isLoading || !imageFile || !newAlbum.title || !selectedArtistId} // Updated disabled condition
					>
						{isLoading ? "Creating..." : "Add Album"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
export default AddAlbumDialog;
