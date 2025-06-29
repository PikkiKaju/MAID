namespace backend_aspdotnet.Database
{
    public class DatasetMeta
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }

        public bool IsPublic { get; set; } = true;
    }
}
