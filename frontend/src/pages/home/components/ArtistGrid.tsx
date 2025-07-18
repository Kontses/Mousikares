import { Artist } from "@/types";
import SectionGridSkeleton from "./SectionGridSkeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type ArtistGridProps = {
	title?: string;
	artists: Artist[];
	isLoading: boolean;
	showAllLink?: { to: string; state: { viewMode: "artists" | "albums"; sortOption: "newest" | "oldest" | "alphabetical" } };
	onImageHover?: (imageUrl: string | null) => void;
};

const ArtistGrid = ({ artists, title, isLoading, showAllLink, onImageHover }: ArtistGridProps) => {
	if (isLoading) return <SectionGridSkeleton />;

	return (
		<div className='mb-8'>
			<div className='flex items-center justify-between mb-4'>
				{title && <h2 className='text-xl sm:text-2xl font-bold'>{title}</h2>}
				{showAllLink && (
					<Link to={showAllLink.to} state={showAllLink.state}>
						<Button variant='link' className='text-sm text-zinc-400 hover:text-white'>
							Show all
						</Button>
					</Link>
				)}
			</div>

			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				{artists.map((artist) => (
					<Link to={`/artists/${artist._id}`} key={artist._id}>
						<div
							className='bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer'
							onMouseEnter={() => onImageHover && onImageHover(artist.profilePhotoUrl)}
							onMouseLeave={() => onImageHover && onImageHover(null)}
						>
							<div className='relative mb-4'>
								<div className='aspect-square rounded-full shadow-lg overflow-hidden'>
									<img
										src={artist.profilePhotoUrl}
										alt={artist.name}
										className='w-full h-full object-cover transition-transform duration-300 
										group-hover:scale-105'
									/>
								</div>
							</div>
							<h3 className='font-medium mb-2 truncate'>{artist.name}</h3>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
};

export default ArtistGrid; 