import { getMicropostsByUserId, createMicropost, getAllMicroposts, getMicropostById } from '../services/micropostService.js';
import { getUserByIdFromDB } from '../services/userService.js';
import { MicropostParamsSchema, CreateMicropostSchema, MicropostQueryParamsSchema, UserMicropostQueryParamsSchema, MicropostIdParamsSchema } from '../../../shared/schemas/micropost.js';
import { handleAsyncError, NotFoundError, ValidationError } from '../utils/errors.js';

export const getUserMicroposts = handleAsyncError(async (req, res) => {
  // Validate path and query parameters
  const { userId } = MicropostParamsSchema.parse(req.params);
  const { page, limit, since, until } = UserMicropostQueryParamsSchema.parse(req.query);
  
  // Check if user exists
  const user = await getUserByIdFromDB(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  
  let userMicroposts = await getMicropostsByUserId(userId);
  
  // Date filtering
  if (since) {
    userMicroposts = userMicroposts.filter(post => new Date(post.createdAt) >= new Date(since));
  }
  if (until) {
    userMicroposts = userMicroposts.filter(post => new Date(post.createdAt) <= new Date(until));
  }
  
  // Sort by created date (newest first)
  userMicroposts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Calculate pagination
  const total = userMicroposts.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedMicroposts = userMicroposts.slice(offset, offset + limit);
  
  // Add user info and contentLength to each micropost
  const enrichedMicroposts = paginatedMicroposts.map(post => ({
    ...post,
    contentLength: post.content.length,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email
    } : null
  }));
  
  const response = {
    data: enrichedMicroposts,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    meta: {
      userId: userId,
      userName: user ? user.name : null
    }
  };
  
  res.status(200).json(response);
});

export const createUserMicropost = handleAsyncError(async (req, res) => {
  // Validate path and body parameters
  const { userId } = MicropostParamsSchema.parse(req.params);
  const { content } = CreateMicropostSchema.parse(req.body);
  
  // Check if user exists
  const user = await getUserByIdFromDB(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  
  const newMicropost = await createMicropost(userId, content);
  
  // Add user info and contentLength
  const enrichedMicropost = {
    ...newMicropost,
    contentLength: newMicropost.content.length,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email
    } : null
  };
  
  const response = {
    data: enrichedMicropost
  };
  
  res.status(201).json(response);
});

export const getAllMicropostsController = handleAsyncError(async (req, res) => {
  // Validate query parameters
  const { page, limit, search } = MicropostQueryParamsSchema.parse(req.query);
  
  let microposts = await getAllMicroposts();
  
  // Search functionality
  if (search) {
    const searchLower = search.toLowerCase();
    microposts = microposts.filter(post => 
      post.content.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by created date (newest first)
  microposts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Calculate pagination
  const total = microposts.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedMicroposts = microposts.slice(offset, offset + limit);
  
  // Add user info and contentLength to each micropost
  const enrichedMicroposts = await Promise.all(
    paginatedMicroposts.map(async post => {
      const user = await getUserByIdFromDB(post.userId);
      return {
        ...post,
        contentLength: post.content.length,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email
        } : null
      };
    })
  );
  
  const response = {
    data: enrichedMicroposts,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
  
  res.status(200).json(response);
});

export const getMicropostByIdController = handleAsyncError(async (req, res) => {
  // Validate path parameters
  const { micropostId } = MicropostIdParamsSchema.parse(req.params);
  
  const micropost = await getMicropostById(micropostId);
  if (!micropost) {
    throw new NotFoundError('Micropost');
  }
  
  // Get user info
  const user = await getUserByIdFromDB(micropost.userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  
  // Add user info and contentLength
  const enrichedMicropost = {
    ...micropost,
    contentLength: micropost.content.length,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email
    } : null
  };
  
  const response = {
    data: enrichedMicropost
  };
  
  res.status(200).json(response);
});