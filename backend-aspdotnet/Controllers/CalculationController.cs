using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Globalization;
using System.Text.Json;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CalculationController : ControllerBase
    {

        [Authorize]
        [HttpPost("linear")]
        public async Task<IActionResult> LinearRegression([FromBody] Guid projectId, [FromServices] AppDbContext db, [FromServices] ElementDBConterxt mongoDb)
        {
            var userId = User.FindFirst("id")?.Value;

            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                return Unauthorized("Invalid user ID");

            // Get project from Postgres
            var project = db.Projects.FirstOrDefault(p => p.Id == projectId && p.UserId == userGuid);
            if (project == null)
                return NotFound("Project not found or not authorized");

            // Get dataset info from Mongo using project.DatasetId
            var rawDataset = mongoDb.Datasets.Find(d => d.Id == project.DatasetId).FirstOrDefault();
            if (rawDataset == null)
                return NotFound("Dataset not found in MongoDB");

            // Get project details from Mongo
            var projectDetails = mongoDb.ProjectDetails.Find(p => p.Id == project.Id).FirstOrDefault();
            if (projectDetails == null)
                return NotFound("Project details not found in MongoDB");

            // Prepare BaseRegressionDTO
            List<double> xValues = rawDataset.Data[projectDetails.XColumn]
    .Select(s => double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : (double?)null)
    .Where(d => d.HasValue)
    .Select(d => d.Value)
    .ToList();
            List<double> yValues = rawDataset.Data[projectDetails.YColumn]
  .Select(s => double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : (double?)null)
  .Where(d => d.HasValue)
  .Select(d => d.Value)
  .ToList();



            var input = new BaseRegressionDTO
            {
                X = xValues,
                Y = yValues,
                Algorithm = projectDetails.Algorithm,
 
            };

            var pythonService = new PythonConectService();
            var responseJson = await pythonService.SendDataAsync(input, projectDetails.Algorithm);

            if (string.IsNullOrEmpty(responseJson))
                return StatusCode(500, "Failed to get response from Python service.");

            var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson);

            return Ok(responseData);
        }

    }
}
