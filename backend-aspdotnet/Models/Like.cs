namespace backend_aspdotnet.Models
{
    public class Like
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public Guid ProjectId { get; set; }
    }
}