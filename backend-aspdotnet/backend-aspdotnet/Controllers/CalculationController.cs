using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CalculationController : ControllerBase
    {

        [HttpPost("results")]
        public IActionResult ReceiveResults([FromBody] ResultDto result)
        {
            // recuve python results
            return Ok();
        }

    }
}
