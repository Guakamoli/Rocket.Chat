
import { MessageAttachmentBase } from '../MessageAttachmentBase';
import { FileAttachmentProps } from './FileAttachmentProps';
import { FileProp } from './FileProp';
import { Dimensions } from './Dimensions';

export type VideoAttachmentCoverProps = {
	video_cover_url?: string;
	video_cover_type?: string;
	video_cover_dimensions?: Dimensions;
};

export type VideoAttachmentProps = {
	video_url: string;
	video_type: string;
	video_size: number;
	video_width: number;
	video_height: number;
	file?: FileProp;
	crop_params?: any;
} & VideoAttachmentCoverProps & MessageAttachmentBase;

export const isFileVideoAttachment = (
	attachment: FileAttachmentProps,
): attachment is VideoAttachmentProps & { type: 'file' } => 'video_url' in attachment;
