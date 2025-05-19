using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetController : ControllerBase
    {
        [HttpPost("upload-csv")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCsv([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            using var reader = new StreamReader(file.OpenReadStream());
            var content = await reader.ReadToEndAsync();
            MongoDriver e = new MongoDriver();
            e.InsertSampleDocument();
            // Process CSV here

            return Ok(new { message = "CSV received", length = content.Length });
        }
        // dostępne bazy
        // usównanie bazy

    }
}
