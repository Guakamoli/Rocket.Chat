/**
 * @description 阿里推送的消息结构
 * @link https://help.aliyun.com/document_detail/48089.htm?spm=a2c4g.11186623.0.0.6b4b518bzuMIuq#doc-api-Push-Push
 */
export interface IAliyunPushRequest {
	action?: 'Push';
	appKey: number;
	body: string;
	deviceType: string;
	pushType: string;
	target: string; // 推送目标，可以是用户帐号、设备标识、指定别名、指定Tag组合
	targetValue?: string; // 如果是按用户推送，则需要指定用户的ID
	title?: string;	// 推送标题 (Android必选)
	jobKey?: string;
	sendSpeed?: number;
	storeOffline?: boolean;
	pushTime?: string;
	expireTime?: string;
	iOSApnsEnv?: string;
	iOSRemind?: boolean;
	iOSRemindBody?: string;
	iOSBadge?: number;
	iOSBadgeAutoIncrement?:	boolean;
	iOSSilentNotification?: boolean;
	iOSMusic?: string;
	iOSSubtitle?: string;
	iOSNotificationCategory?: string;
	iOSMutableContent?: boolean;
	iOSExtParameters?: string;
	iOSNotificationCollapseId?: string;
	iOSNotificationThreadId?: string;
	androidNotifyType?: string;
	androidOpenType?: string;
	androidActivity?: string;
	androidMusic?: string;
	androidOpenUrl?: string;
	androidPopupActivity?: string;
	androidPopupTitle?: string;
	androidPopupBody?: string;
	androidNotificationBarType?: number;
	androidNotificationBarPriority?: number;
	androidExtParameters?: string;
	androidRemind?: boolean;
	androidNotificationChannel?: string;
	androidNotificationXiaomiChannel?: string;
	androidNotificationVivoChannel?: string;
	androidNotificationHuaweiChannel?: string;
	androidNotificationNotifyId?: number;
	androidRenderStyle?: string;
	androidBigTitle?: string;
	androidBigBody?: string;
	androidXiaomiBigPictureUrl?: string;
	androidBigPictureUrl?: string;
	androidInboxBody?: string;
	androidImageUrl?: string;
	androidXiaomiImageUrl?: string;
	androidMessageHuaweiUrgency?: string;
	androidMessageHuaweiCategory?: string;
	sendChannels?: string;
	smsTemplateName?: string;
	smsSignName?: string;
	smsParams?: string;
	smsDelaySecs?: number;
	smsSendPolicy?: number;
}

export type IAliyunPushNotification = {
	uid: string;
	request: IAliyunPushRequest;
};
