﻿namespace backend_aspdotnet.DTOs
{
    public class UpdateProjectDetailsDto
    {
        public string? Algorithm { get; set; }
        public string? XColumn { get; set; }
        public string? YColumn { get; set; }
        public Dictionary<string, string>? Parameters { get; set; }
        public bool? isPublic { get; set; }
    }

}
