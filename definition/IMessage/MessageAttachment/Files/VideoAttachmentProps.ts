
import { MessageAttachmentBase } from '../MessageAttachmentBase';
import { FileAttachmentProps } from './FileAttachmentProps';
import { FileProp } from './FileProp';

export type VideoAttachmentProps = {
	video_url: string;
	video_type: string;
	video_size: number;
	video_width: number;
	video_height: number;
	file?: FileProp;
} & MessageAttachmentBase;

export const isFileVideoAttachment = (
	attachment: FileAttachmentProps,
): attachment is VideoAttachmentProps & { type: 'file' } => 'video_url' in attachment;
