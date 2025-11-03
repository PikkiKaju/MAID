namespace backend_aspdotnet.Database
{
    public enum DatasetType
    {
        Csv,
        Photo,
    }
    public class DatasetMeta
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public Guid UserId { get; set; }
        public DatasetType DataType { get; set; }
        public DateTime CreatedAt { get; set; }

        public bool IsPublic { get; set; } = true;
        public int Likes { get; set; } = 0;
    }
}
