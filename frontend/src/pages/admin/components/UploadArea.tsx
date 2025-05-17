import React, { useState, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { axiosInstance } from "@/lib/axios"; // Import axiosInstance
import toast from "react-hot-toast"; // Import toast
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ButtonProps } from "@/components/ui/button"; // Import ButtonProps
import { useAuth } from "@clerk/clerk-react"; // Import useAuth
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'; // Import restrictToVerticalAxis

const UploadArea = () => {
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth(); // Get getToken from useAuth


  const [singleSongDetails, setSingleSongDetails] = useState({
    title: "",
    artist: "",
    // Add other single song fields as needed (e.g., genre, tags, description)
  });

  const [albumDetails, setAlbumDetails] = useState({
    title: "",
    artist: "",
    releaseDate: "", // Change to releaseDate string
    generalGenre: "", // Add generalGenre
    specificGenres: "", // Store as raw string for input
    description: "", // Added description field
  });

  const [albumSongsDetails, setAlbumSongsDetails] = useState<{ title: string, fileName: string }[]>([]); // Include fileName

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of motion before activating
      },
      axis: 'y', // Limit movement to the vertical axis
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('audio/'));
    setAudioFiles(files);
    // Initialize albumSongsDetails based on dropped files, including fileName
    setAlbumSongsDetails(files.map(file => ({ title: file.name.replace(/\.[^/.]+$/, ""), fileName: file.name })));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('audio/'));
    setAudioFiles(files);
     // Initialize albumSongsDetails based on selected files, including fileName
    setAlbumSongsDetails(files.map(file => ({ title: file.name.replace(/\.[^/.]+$/, ""), fileName: file.name })));
  };

   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setImageFile(file);
		}
	};


  const handleSubmit = async () => {
    if (audioFiles.length === 0) {
      toast.error("Please upload at least one audio file.");
      return;
    }
    if (!imageFile) {
       toast.error("Please upload artwork.");
       return;
    }

    // Basic validation for song titles
    if (audioFiles.length === 1) {
      if (!singleSongDetails.title.trim()) {
        toast.error("Please enter a title for the song.");
        return;
      }
    } else {
      const emptyTitleSong = albumSongsDetails.find(song => !song.title.trim());
      if (emptyTitleSong) {
        toast.error(`Please enter a title for the song "${emptyTitleSong.fileName}".`);
        return;
      }
    }

    setIsLoading(true);
    const formData = new FormData();

    // Append audio files
    audioFiles.forEach((file, index) => {
      formData.append(`audioFiles`, file); // Use the same key 'audioFiles' as expected in backend
    });

    // Append image file
    formData.append('imageFile', imageFile); // Use the key 'imageFile' as expected in backend

    // Append form details based on the number of audio files
    if (audioFiles.length === 1) {
      formData.append('singleSongDetails', JSON.stringify(singleSongDetails));
    } else {
      // When submitting, split and trim specificGenres from the raw input value
      const specificGenresArray = (albumDetails.specificGenres as any as string).split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      formData.append('albumDetails', JSON.stringify({...albumDetails, specificGenres: specificGenresArray})); // Send processed specificGenres
      formData.append('albumSongsDetails', JSON.stringify(albumSongsDetails)); // albumSongsDetails will now have the correct order
    }

    try {
      const token = await getToken(); // Get the token
      const response = await axiosInstance.post("/admin/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`, // Add Authorization header
        },
      });

      console.log("Upload successful:", response.data);
      toast.success(audioFiles.length === 1 ? "Song uploaded successfully!" : "Album uploaded successfully!");

      // Clear form
      setAudioFiles([]);
      setImageFile(null);
      setSingleSongDetails({ title: "", artist: "" });
      setAlbumDetails({ title: "", artist: "", releaseDate: "", generalGenre: "", specificGenres: "" as string, description: "" }); // Clear specificGenres as raw string and add description
      setAlbumSongsDetails([]);
       if (fileInputRef.current) fileInputRef.current.value = "";
       if (imageInputRef.current) imageInputRef.current.value = "";


    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error("Upload failed: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      setAlbumSongsDetails((items) => {
        const oldIndex = items.findIndex(item => item.title === active.id); // Assuming title is unique for simplicity
        const newIndex = items.findIndex(item => item.title === over.id);

        // Use arrayMove from @dnd-kit/sortable/utilities
        const arrayMove = (array: any[], oldIndex: number, newIndex: number) => {
          const newArray = [...array];
          const [element] = newArray.splice(oldIndex, 1);
          newArray.splice(newIndex, 0, element);
          return newArray;
        };

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // SortableItem component for individual songs
  const SortableItem = ({ song, index }: { song: { title: string, fileName: string }, index: number }) => { // Update prop type
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: song.title }); // Use song title as the unique ID

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center space-x-2 bg-zinc-800 p-2 rounded-md cursor-grab" // Added cursor style
      >
        <span className="text-zinc-400">{index + 1}.</span>
        <Input
          value={song.title}
          onChange={(e) => {
            setAlbumSongsDetails(prevSongs =>
              prevSongs.map((s, i) => {
                if (i === index) {
                  return { ...s, title: e.target.value }; // Update title
                }
                return s;
              })
            );
          }}
          className='bg-zinc-700 border-zinc-600 flex-grow'
          placeholder={`Enter title for ${song.fileName}`} // Use song.fileName here
        />
        <span className="text-zinc-400 text-sm">{song.fileName}</span> {/* Display song.fileName */}
        {/* Add edit/delete icons later */}
      </li>
    );
  };


  return (
    <div className='space-y-6'>
       <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-zinc-700 bg-zinc-800/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className='mb-4'>
          <Upload className='mx-auto h-12 w-12 text-zinc-400' />
        </div>
        <p className='text-zinc-400 mb-4'>Drag and drop audio files here, or click to select files</p>
        <input type="file" multiple accept="audio/*" className="hidden" id="audio-upload-input" onChange={handleFileSelect} ref={fileInputRef} />
        <label htmlFor="audio-upload-input" className="cursor-pointer bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded">
          Choose files
        </label>
      </div>

      {audioFiles.length > 0 && (
        <div className="space-y-6">
           <input
						type='file'
						ref={imageInputRef}
						onChange={handleImageSelect}
						accept='image/*'
						className='hidden'
					/>
					<div
						className='flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer'
						onClick={() => imageInputRef.current?.click()}
					>
						<div className='text-center'>
							<div className='p-3 bg-zinc-800 rounded-full inline-block mb-2'>
								<Upload className='h-6 w-6 text-zinc-400' />
							</div>
							<div className='text-sm text-zinc-400 mb-2'>
								{imageFile ? imageFile.name : "Upload album/single artwork"}
							</div>
							<Button variant='outline' size='sm' className='text-xs'>
								Choose File
							</Button>
						</div>
					</div>

          {/* Conditionally render forms based on the number of audio files */}
          {audioFiles.length === 1 ? (
            /* Single Song Form */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Single Song Details</h3>
               <div className='space-y-2'>
                  <label className='text-sm font-medium'>Song Title</label>
                  <Input
                    value={singleSongDetails.title}
                    onChange={(e) => setSingleSongDetails({ ...singleSongDetails, title: e.target.value })}
                    className='bg-zinc-800 border-zinc-700'
                    placeholder='Enter song title'
                  />
                </div>
                 <div className='space-y-2'>
                  <label className='text-sm font-medium'>Artist</label>
                  <Input
                    value={singleSongDetails.artist}
                    onChange={(e) => setSingleSongDetails({ ...singleSongDetails, artist: e.target.value })}
                    className='bg-zinc-800 border-zinc-700'
                    placeholder='Enter artist name'
                  />
                </div>
                {/* Add other single song fields here */}
            </div>
          ) : (
            /* Album Form */
            <div className="space-y-4">
               <h3 className="text-lg font-semibold">Album Details</h3>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Album Title</label>
                  <Input
                    value={albumDetails.title}
                    onChange={(e) => setAlbumDetails({ ...albumDetails, title: e.target.value })}
                    className='bg-zinc-800 border-zinc-700'
                    placeholder='Enter album title'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Artist</label>
                  <Input
                    value={albumDetails.artist}
                    onChange={(e) => setAlbumDetails({ ...albumDetails, artist: e.target.value })}
                    className='bg-zinc-800 border-zinc-700'
                    placeholder='Enter artist name'
                  />
                </div>
                 <div className='space-y-2'>
                  <label className='text-sm font-medium'>Release Date</label>
                  <Input
                    type='date'
                    value={albumDetails.releaseDate}
                    onChange={(e) => setAlbumDetails({ ...albumDetails, releaseDate: e.target.value })}
                    className='bg-zinc-800 border-zinc-700'
                  />
                </div>

                {/* Description */}
                <div className='space-y-2'>
                  <label htmlFor="description" className='text-sm font-medium'>Album Description</label>
                  <textarea
                    id="description"
                    value={albumDetails.description}
                    onChange={(e) => setAlbumDetails({ ...albumDetails, description: e.target.value })}
                    className='flex h-20 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm ring-offset-zinc-950 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]'
                    placeholder='Enter album description'
                  />
                </div>

                {/* Genre Section */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold mt-6">Genre</h4>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>General Genre</label>
                    <Select onValueChange={(value) => setAlbumDetails({ ...albumDetails, generalGenre: value })}>
                      <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                      <SelectContent className='bg-zinc-900 text-white border-zinc-700'>
                        <SelectItem value="Alternative">Alternative</SelectItem>
                        <SelectItem value="Ambient">Ambient</SelectItem>
                        <SelectItem value="Blues">Blues</SelectItem>
                        <SelectItem value="Classical">Classical</SelectItem>
                        <SelectItem value="Dance">Dance</SelectItem>
                        <SelectItem value="DJ Set">DJ Set</SelectItem> {/* Added DJ Set */}
                        <SelectItem value="Electronic">Electronic</SelectItem>
                        <SelectItem value="Folk">Folk</SelectItem>
                        <SelectItem value="Hip Hop/Rap">Hip Hop/Rap</SelectItem>
                        <SelectItem value="Jazz">Jazz</SelectItem>
                        <SelectItem value="Metal">Metal</SelectItem>
                        <SelectItem value="Pop">Pop</SelectItem>
                        <SelectItem value="Punk">Punk</SelectItem>
                        <SelectItem value="Reggae">Reggae</SelectItem>
                        <SelectItem value="Rock">Rock</SelectItem>
                        <SelectItem value="Singer/Songwriter">Singer/Songwriter</SelectItem>
                        <SelectItem value="Soundtrack">Soundtrack</SelectItem>
                        <SelectItem value="Spoken Word">Spoken Word</SelectItem>
                        <SelectItem value="World">World</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Specific Genre (comma-separated tags)</label>
                    <Input
                      value={albumDetails.specificGenres as any as string} // Use raw string value for input
                      onChange={(e) => setAlbumDetails({ ...albumDetails, specificGenres: e.target.value })} // Update state with raw string
                      className='bg-zinc-800 border-zinc-700'
                      placeholder='e.g., Indie Rock, Psychedelic, Garage'
                    />
                  </div>
                </div>
            </div>
          )}

          {/* Songs in Album section - always show if audio files are selected */}
          {audioFiles.length > 0 && (
            <div className="space-y-4">
               <h4 className="text-lg font-semibold mt-6">Songs in Album</h4>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]} // Add the modifier here
                >
                  <SortableContext
                    items={albumSongsDetails.map(song => song.title)} // Use song titles as unique IDs
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {albumSongsDetails.map((song, index) => (
                        <SortableItem key={song.title} song={song} index={index} /> // Use SortableItem component
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
            </div>
          )}


          <Button onClick={handleSubmit} className='bg-violet-500 hover:bg-violet-600' disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
