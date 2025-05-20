using System.ComponentModel.DataAnnotations;

namespace backend_aspdotnet.Database
{
    public class ProjectMeta
    {
        [Key]
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid DatasetId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
    }
}
