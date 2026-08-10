const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reviews'`;

const replacement = `              </tbody>
            </table>
            <Pagination meta={expensesPagination} onPageChange={(page) => refreshExpenses(page, 10)} />
          </div>
        </div>
      )}

      {activeTab === 'reviews'`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('done expenses');
