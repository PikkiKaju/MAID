namespace backend_aspdotnet.Models
{
    public class Blocked
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime BlockedUntil { get; set; }
    }
}