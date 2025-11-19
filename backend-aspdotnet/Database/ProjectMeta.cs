using System.ComponentModel.DataAnnotations;

namespace backend_aspdotnet.Database
{
    public enum ProjectStatus
    {
        Draft,
        Running,
        Active
    }
    public class ProjectMeta
    {
        [Key]
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PictureUrl { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public ProjectStatus Status { get; set; } = ProjectStatus.Draft;
        public Guid DatasetId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public bool IsPublic { get; set; } = true;
        public int Likes { get; set; } = 0;
    }
}
