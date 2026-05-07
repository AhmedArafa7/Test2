$path = 'src\app\features\ai\ai-search\ai-search.ts'
$content = [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$content = $content -replace '(?s)maxPrice.*?</select>\s+</div>', 'maxPrice" placeholder="Max Price" class="bg-gray-50 border-none rounded-xl text-xs font-bold p-3 w-full outline-none">
                    </div>
                  </div>'
[IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
