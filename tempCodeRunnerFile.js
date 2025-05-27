app.get('/images', async (req, res) =>{
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId).select("images");
        
        if (user) {
            res.status(200).json({ images: user.images || [] }); // Return skills or an empty array
        } else {
        res.status(404).json({ message: "User  not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error fetching skills", error });
    }   
});