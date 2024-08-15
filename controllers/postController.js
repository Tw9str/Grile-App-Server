const Post = require("../models/Post");

const createPost = async (req, res) => {
  const { title, tag, description } = req.body;

  try {
    const newPost = new Post({
      title,
      image: req.file ? req.file.filename : "",
      content: description,
      author: req.user.id,
      slug: title.toLowerCase().trim().replace(/ /g, "-"),
      tag,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error creating post:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while creating the post." });
  }
};

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate("author", "username role");
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

const getPost = async (req, res) => {
  const { slug } = req.params;

  try {
    const post = await Post.findOne({ slug }).populate(
      "author",
      "username role"
    );
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

const updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, content, slug, tags, isPublished } = req.body;

  try {
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { title, content, slug, tags, isPublished },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPost = await Post.findByIdAndDelete(id);

    if (!deletedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json({ message: "post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

module.exports = { createPost, getPosts, getPost, updatePost, deletePost };
