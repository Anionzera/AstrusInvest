                <TableCell>
                  <div 
                    className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={() => recommendation.clientId && handleViewClient(recommendation.clientId)}
                  >
                    {recommendation.clientName}
                  </div>
                </TableCell> 