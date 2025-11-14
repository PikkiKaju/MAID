namespace backend_aspdotnet.Models
{
    public class LikeProjects
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid ProjectId { get; set; }
    }
}