// types/post.ts

/**
 * Represents a post in the application
 */
export interface Post {
	_id: string;
	author_name: string;
	author_avatar?: string;
	content: string;
	media: Media[];
	status: PostStatus;
	likes: number;
	comments_count: number;
	timestamp: string;
	tags: string[];
	flagged?: boolean;
	flaggedReason?: string;
	flaggedAt?: string;
	reviewedAt?: string;
	reviewStatus?: 'reviewed' | 'pending';
  }
  
  /**
   * Represents media attached to a post
   */
  export interface Media {
	media_type: MediaType;
	media_url: string;
  }
  
  /**
   * Types of media that can be attached to posts
   */
  export type MediaType = 'image' | 'video' | 'audio' | 'document';
  
  /**
   * Possible statuses for a post
   */
  export type PostStatus = 'active' | 'flagged' | 'deleted' | 'pending';
  
  /**
   * Results of content validation
   */
  export interface ValidationResult {
	postId: string;
	label: string;
	score: number;
	content: string;
  }
  
  /**
   * Response from the validation API
   */
  export interface ValidationResponse {
	success: boolean;
	invalidPosts: ValidationResult[];
	message?: string;
  }
  
  /**
   * Request parameters for post validation
   */
  export interface ValidationRequest {
	silent?: boolean;
	postIds?: string[];
  }
  
  /**
   * Response from the post API
   */
  export interface PostApiResponse {
	success: boolean;
	message?: string;
	posts?: Post[];
	post?: Post;
  }
  
  /**
   * Options for sorting posts
   */
  export type PostSortOrder = 'newest' | 'oldest';
  
  /**
   * View modes for the post listing
   */
  export type PostViewMode = 'normal' | 'flagged' | 'history';