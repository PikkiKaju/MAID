using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace backend_aspdotnet.Database
{
    [Table("elements")]  // PostgreSQL table name
    public class Element
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }  // Use int PK for Postgres, or Guid if you prefer

        [Required]
        public string Name { get; set; }

        public int X { get; set; }
    }
}
