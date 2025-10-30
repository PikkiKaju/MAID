namespace backend_aspdotnet.Database
{
    public class CsvFileMetadata
{
    public Guid FileId { get; set; }
    public string FileName { get; set; }
    public Guid UserId { get; set; }
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }
}
}
