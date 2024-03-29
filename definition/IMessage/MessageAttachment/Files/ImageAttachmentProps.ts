
import { MessageAttachmentBase } from '../MessageAttachmentBase';
import { Dimensions } from './Dimensions';
import { FileAttachmentProps } from './FileAttachmentProps';
import { FileProp } from './FileProp';

export type ImageAttachmentProps = {
	image_dimensions?: Dimensions;
	image_preview?: string;
	image_url: string;
	image_type: string;
	image_size?: number;
	image_width: number;
	image_height: number;
	file?: FileProp;
	crop_params?: any;
	is_cover: boolean;
} & MessageAttachmentBase;

export const isFileImageAttachment = (
	attachment: FileAttachmentProps,
): attachment is ImageAttachmentProps & { type: 'file' } => 'image_url' in attachment;
