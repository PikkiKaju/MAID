namespace backend_aspdotnet.Models
{
    public class Blocked
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime BlockedUntil { get; set; }
    }
}