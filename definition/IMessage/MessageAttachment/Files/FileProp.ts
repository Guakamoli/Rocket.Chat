import { Base64 } from 'aws-sdk/clients/ecr';

export type FileProp = {
	_id: string;
	name: string;
	type: string;
	format: string;
	size: number;
};

type ImageUploadFileProp = {
	image_preview?: Base64; // 图片的预览图
	identify?: {
		size: {
			width: number;
			height: number;
		};
	};
	image_uri? : string;
	width: number;
	height: number;
}
type VideoUploadFileProp = {
	video_cover?: string; // 视频的封面信息, 兼容旧接口
	width: number;
	height: number;
}
export type UploadFileProp = {
	_id?: string;
	name: string;
	type: string;
	size: number;
	uri?: string; // 如果有传就直接作为结果存储
	description?: string;
	fileBuffer?: Buffer;
	cropParams?: any;
	isCover?: boolean;
} & (VideoUploadFileProp & ImageUploadFileProp)
